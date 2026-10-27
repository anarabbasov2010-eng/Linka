use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Emitter, Manager, State};

fn startup_log_path() -> PathBuf {
    let root = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir);
    root.join("Linka").join("startup.log")
}

fn startup_log(message: &str) {
    let path = startup_log_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_secs())
            .unwrap_or_default();
        let single_line = message.replace('\r', " ").replace('\n', " | ");
        let _ = writeln!(file, "[{timestamp}] {single_line}");
    }
}

#[tauri::command]
fn log_startup_diagnostic(message: String) {
    let message: String = message.chars().take(2500).collect();
    startup_log(&format!("frontend: {message}"));
}

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
    if !metadata.is_file() || metadata.len() > 32 * 1024 * 1024 {
        return None;
    }

    fs::read_to_string(path).ok()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::panic::set_hook(Box::new(|info| {
        startup_log(&format!("panic: {info}"));
    }));
    startup_log("Rust entry point reached");
    let mut builder = tauri::Builder::default();

    // Register single-instance first so a browser callback or .linka file is
    // delivered to the existing window instead of creating a second process.
    #[cfg(desktop)]
    {
        startup_log("registering single-instance plugin");
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
        startup_log("registering deep-link plugin");
        builder = builder.plugin(tauri_plugin_deep_link::init());
        startup_log("registering opener plugin");
        builder = builder.plugin(tauri_plugin_opener::init());
    }

    startup_log("registering process and notification plugins");
    builder = builder
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init());

    builder
        .setup(|app| {
            startup_log("Tauri setup callback entered");
            #[cfg(desktop)]
            {
                startup_log("registering updater plugin");
                app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
                startup_log("updater plugin registered");
            }

            let startup_document = std::env::args().skip(1)
                .find_map(|argument| read_linka_document(&argument));
            app.manage(StartupLinkaDocument(Mutex::new(startup_document)));
            startup_log("startup state registered");

            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                if let Err(error) = app.deep_link().register_all() {
                    startup_log(&format!("deep-link registration warning: {error}"));
                } else {
                    startup_log("deep-link scheme registered");
                }
            }
            startup_log("Tauri setup callback finished");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![take_startup_document, log_startup_diagnostic])
        .run(tauri::generate_context!())
        .expect("failed to run Linka desktop application");
}
