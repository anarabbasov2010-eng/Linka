use std::fs;
use std::path::Path;
use std::sync::{atomic::{AtomicBool, Ordering}, Arc, Mutex};
use tauri::{Emitter, Manager, State};

struct StartupLinkaDocument(Mutex<Option<String>>);
struct CloseToTrayState(Arc<AtomicBool>);

#[tauri::command]
fn take_startup_document(state: State<'_, StartupLinkaDocument>) -> Option<String> {
    state.0.lock().ok()?.take()
}

#[tauri::command]
fn set_close_to_tray(enabled: bool, state: State<'_, CloseToTrayState>) {
    state.0.store(enabled, Ordering::Relaxed);
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn read_linka_document(argument: &str) -> Option<String> {
    let path = Path::new(argument);
    if !path.extension().and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("linka"))
    {
        return None;
    }

    // Avoid reading arbitrary large files if a malformed path is passed to Linka.
    let metadata = fs::metadata(path).ok()?;
    if !metadata.is_file() || metadata.len() > 32 * 1024 * 1024 {
        return None;
    }

    fs::read_to_string(path).ok()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Register single-instance first so a browser callback or .linka file is
    // delivered to the existing window instead of creating a second process.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                for argument in &argv {
                    if let Some(contents) = read_linka_document(argument) {
                        let _ = window.emit("linka-open-document", contents);
                        break;
                    }
                }
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }));
        builder = builder.plugin(tauri_plugin_deep_link::init());
        builder = builder.plugin(tauri_plugin_opener::init());
        builder = builder.plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        show_main_window(app);
                        let _ = app.emit("linka-global-capture", ());
                    }
                })
                .build(),
        );
    }

    builder = builder
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init());

    builder
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;

            let startup_document = std::env::args().skip(1)
                .find_map(|argument| read_linka_document(&argument));
            app.manage(StartupLinkaDocument(Mutex::new(startup_document)));
            let close_to_tray = Arc::new(AtomicBool::new(true));
            app.manage(CloseToTrayState(close_to_tray.clone()));

            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                if let Err(error) = app.deep_link().register_all() {
                    eprintln!("Could not register Linka URL scheme: {error}");
                }
            }

            #[cfg(desktop)]
            {
                use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
                use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
                use tauri_plugin_global_shortcut::GlobalShortcutExt;

                let open_item = MenuItem::with_id(app, "open", "Open Linka", true, None::<&str>)?;
                let capture_item = MenuItem::with_id(app, "quick-capture", "Quick capture", true, None::<&str>)?;
                let separator = PredefinedMenuItem::separator(app)?;
                let quit_item = MenuItem::with_id(app, "quit", "Quit Linka", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&open_item, &capture_item, &separator, &quit_item])?;

                let tray_builder = TrayIconBuilder::with_id("linka-tray")
                    .tooltip("Linka · local-first")
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id().as_ref() {
                        "open" => show_main_window(app),
                        "quick-capture" => {
                            show_main_window(app);
                            let _ = app.emit("linka-tray-quick-capture", ());
                        }
                        "quit" => app.exit(0),
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            show_main_window(tray.app_handle());
                        }
                    });

                let tray_builder = if let Some(icon) = app.default_window_icon() {
                    tray_builder.icon(icon.clone())
                } else {
                    tray_builder
                };
                tray_builder.build(app)?;

                if let Err(error) = app.global_shortcut().register("Ctrl+Alt+Space") {
                    eprintln!("Could not register Linka quick-capture shortcut Ctrl+Alt+Space: {error}");
                }

                #[cfg(windows)]
                if let Some(window) = app.get_webview_window("main") {
                    let window_to_hide = window.clone();
                    let close_to_tray_state = close_to_tray.clone();
                    window.on_window_event(move |event| {
                        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                            if close_to_tray_state.load(Ordering::Relaxed) {
                                api.prevent_close();
                                let _ = window_to_hide.hide();
                            }
                        }
                    });
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![take_startup_document, set_close_to_tray])
        .run(tauri::generate_context!())
        .expect("failed to run Linka desktop application");
}
