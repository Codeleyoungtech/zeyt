mod pty;
mod settings;
mod workspaces;
mod history;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            history::init_history(app.handle());
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
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
            settings::send_os_notification,
            history::save_command,
            history::get_suggestions,
            history::clear_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
