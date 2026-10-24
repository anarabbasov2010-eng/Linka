use std::fs;
use std::path::Path;
use std::sync::Mutex;
use tauri::{Emitter, Manager, State};

struct StartupLinkaDocument(Mutex<Option<String>>);

#[tauri::command]
fn take_startup_document(state: State<'_, StartupLinkaDocument>) -> Option<String> {
    state.0.lock().ok()?.take()
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
    if !metadata.is_file() || metadata.len() > 20 * 1024 * 1024 {
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
                let _ = window.set_focus();
            }
        }));
        builder = builder.plugin(tauri_plugin_deep_link::init());
        builder = builder.plugin(tauri_plugin_opener::init());
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

            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                if let Err(error) = app.deep_link().register_all() {
                    eprintln!("Could not register Linka URL scheme: {error}");
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![take_startup_document])
        .run(tauri::generate_context!())
        .expect("failed to run Linka desktop application");
}
