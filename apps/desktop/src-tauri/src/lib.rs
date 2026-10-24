use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::SystemTime;
use tauri::{Emitter, Manager, State};

fn diagnostic_log_path() -> PathBuf {
    std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .map(|base| base.join("Linka").join("logs").join("startup.log"))
        .unwrap_or_else(|| std::env::temp_dir().join("Linka").join("startup.log"))
}

fn write_startup_diagnostic(message: &str) {
    let path = diagnostic_log_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "[{:?}] {}", SystemTime::now(), message);
    }
}

#[cfg(windows)]
fn show_startup_error(message: &str) {
    if std::env::var_os("GITHUB_ACTIONS").is_some() {
        return;
    }
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    let title: Vec<u16> = OsStr::new("Linka could not start").encode_wide().chain(std::iter::once(0)).collect();
    let text: Vec<u16> = OsStr::new(message).encode_wide().chain(std::iter::once(0)).collect();
    #[link(name = "user32")]
    extern "system" {
        fn MessageBoxW(hwnd: *mut std::ffi::c_void, text: *const u16, caption: *const u16, flags: u32) -> i32;
    }
    unsafe { let _ = MessageBoxW(std::ptr::null_mut(), text.as_ptr(), title.as_ptr(), 0x10); }
}

#[cfg(not(windows))]
fn show_startup_error(_message: &str) {}

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
    if !metadata.is_file() || metadata.len() > 64 * 1024 * 1024 {
        return None;
    }

    fs::read_to_string(path).ok()
}

pub fn run() {
    let previous_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        write_startup_diagnostic(&format!("panic: {info}"));
        show_startup_error(&format!(
            "Linka encountered a startup failure. Diagnostic details were saved to: {}",
            diagnostic_log_path().display()
        ));
        previous_hook(info);
    }));
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

    let app_result = builder
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;

            let startup_document = std::env::args().skip(1)
                .find_map(|argument| read_linka_document(&argument));
            app.manage(StartupLinkaDocument(Mutex::new(startup_document)));

            #[cfg(windows)]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                if let Err(error) = app.deep_link().register_all() {
                    eprintln!("Could not register Linka URL scheme: {error}");
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![take_startup_document])
        .run(tauri::generate_context!());
    if let Err(error) = app_result {
        write_startup_diagnostic(&format!("failed to run Linka desktop application: {error}"));
        show_startup_error(&format!(
            "Linka could not start: {error}\n\nDiagnostic log: {}",
            diagnostic_log_path().display()
        ));
    }
}
