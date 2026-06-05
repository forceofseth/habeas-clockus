use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, contents: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(&path, contents).map_err(|e| e.to_string())
}

fn config_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("last_file.txt"))
}

#[tauri::command]
fn get_remembered_file(app: tauri::AppHandle) -> Option<String> {
    let p = config_file(&app).ok()?;
    let s = fs::read_to_string(p).ok()?.trim().to_string();
    if s.is_empty() {
        None
    } else {
        Some(s)
    }
}

#[tauri::command]
fn set_remembered_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let p = config_file(&app)?;
    fs::write(p, path).map_err(|e| e.to_string())
}

// Set the macOS Dock icon at runtime so it also shows during `tauri dev`
// (a bare debug binary otherwise gets a generic Dock icon).
#[cfg(target_os = "macos")]
fn set_dock_icon() {
    use objc2::{AnyThread, MainThreadMarker};
    use objc2_app_kit::{NSApplication, NSImage};
    use objc2_foundation::NSData;

    let Some(mtm) = MainThreadMarker::new() else {
        return;
    };
    let bytes: &[u8] = include_bytes!("../icons/icon.png");
    let data = NSData::with_bytes(bytes);
    unsafe {
        if let Some(image) = NSImage::initWithData(NSImage::alloc(), &data) {
            let app = NSApplication::sharedApplication(mtm);
            app.setApplicationIconImage(Some(&image));
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            #[cfg(target_os = "macos")]
            set_dock_icon();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            get_remembered_file,
            set_remembered_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
