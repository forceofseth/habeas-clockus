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

// Production-only native menu with a "check for updates" item. In `tauri dev`
// (debug) this is not installed, so the updater menu only exists in release.
#[cfg(not(debug_assertions))]
fn setup_menu(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::menu::{AboutMetadataBuilder, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
    use tauri::Emitter;

    let handle = app.handle();

    // Show the app version in the "About Habeas Clockus" panel.
    let about = AboutMetadataBuilder::new()
        .name(Some("Habeas Clockus"))
        .version(Some(handle.package_info().version.to_string()))
        .build();

    let check = MenuItemBuilder::with_id("check-update", "Nach Updates suchen…").build(handle)?;
    let check_id = check.id().clone();

    let app_menu = SubmenuBuilder::new(handle, "Habeas Clockus")
        .about(Some(about))
        .separator()
        .item(&check)
        .separator()
        .quit()
        .build()?;
    let edit_menu = SubmenuBuilder::new(handle, "Bearbeiten")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;
    let menu = MenuBuilder::new(handle).item(&app_menu).item(&edit_menu).build()?;
    app.set_menu(menu)?;

    app.on_menu_event(move |app, event| {
        if event.id() == &check_id {
            let _ = app.emit("menu:check-update", ());
        }
    });
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
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

            #[cfg(not(debug_assertions))]
            setup_menu(app)?;

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
