use std::fs;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn load_settings(app: AppHandle) -> Result<String, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let path = app_dir.join("settings.json");
    if path.exists() {
        fs::read_to_string(path).map_err(|e| e.to_string())
    } else {
        Ok("{}".to_string())
    }
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings_json: String) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let path = app_dir.join("settings.json");
    fs::write(path, settings_json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn send_os_notification(app_handle: tauri::AppHandle, title: String, body: String) {
    #[cfg(target_os = "linux")]
    {
        let _ = &app_handle;
        let _ = std::process::Command::new("notify-send")
            .arg(&title)
            .arg(&body)
            .spawn();
    }
    #[cfg(not(target_os = "linux"))]
    {
        use tauri_plugin_notification::NotificationExt;
        let _ = app_handle.notification().builder()
            .title(&title)
            .body(&body)
            .show();
    }
}
