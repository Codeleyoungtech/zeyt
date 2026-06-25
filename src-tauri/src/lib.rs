mod pty;
mod settings;
mod workspaces;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            pty::spawn_pty,
            pty::write_pty,
            pty::resize_pty,
            pty::kill_pty,
            pty::get_pty_cwd,
            settings::load_settings,
            settings::save_settings,
            workspaces::load_workspaces,
            workspaces::save_workspaces,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
