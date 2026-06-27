use std::collections::{HashMap, VecDeque};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

const MAX_HISTORY_PER_DIR: usize = 500;

#[derive(Default, Serialize, Deserialize, Clone)]
pub struct CommandHistory {
    // cwd -> list of commands (most recent last)
    directories: HashMap<String, VecDeque<String>>,
}

pub struct HistoryState(Mutex<CommandHistory>);

impl HistoryState {
    pub fn new() -> Self {
        Self(Mutex::new(CommandHistory::default()))
    }
}

fn get_history_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    Ok(app_dir.join("cmd_history.json"))
}

pub fn init_history(app: &AppHandle) {
    let state = HistoryState::new();
    if let Ok(path) = get_history_path(app) {
        if path.exists() {
            if let Ok(data) = fs::read_to_string(&path) {
                if let Ok(history) = serde_json::from_str::<CommandHistory>(&data) {
                    *state.0.lock().unwrap() = history;
                }
            }
        }
    }
    app.manage(state);
}

#[tauri::command]
pub fn save_command(
    app: AppHandle,
    state: State<'_, HistoryState>,
    cwd: String,
    command: String,
) -> Result<(), String> {
    let trimmed = command.trim();
    if trimmed.is_empty() || command.starts_with(' ') {
        return Ok(());
    }

    let mut history = state.0.lock().unwrap();
    let entry = history.directories.entry(cwd.clone()).or_insert_with(VecDeque::new);
    
    // Remove if already exists so we can bump it to the end (most recent)
    if let Some(idx) = entry.iter().position(|c| c == trimmed) {
        entry.remove(idx);
    }
    
    entry.push_back(trimmed.to_string());
    
    if entry.len() > MAX_HISTORY_PER_DIR {
        entry.pop_front();
    }

    // Persist to disk
    if let Ok(path) = get_history_path(&app) {
        if let Ok(json) = serde_json::to_string(&*history) {
            let _ = fs::write(path, json);
        }
    }

    Ok(())
}

#[tauri::command]
pub fn get_suggestions(
    state: State<'_, HistoryState>,
    cwd: String,
    prefix: String,
) -> Result<Vec<String>, String> {
    if prefix.is_empty() {
        return Ok(vec![]);
    }

    let history = state.0.lock().unwrap();
    let mut results = Vec::new();

    // 1. Exact cwd match
    if let Some(cmds) = history.directories.get(&cwd) {
        // Iterate backwards (most recent first)
        for cmd in cmds.iter().rev() {
            if cmd.starts_with(&prefix) && !results.contains(cmd) {
                results.push(cmd.clone());
            }
        }
    }

    // 2. Fall back to parent directory matches if exact match didn't yield much
    if results.is_empty() {
        let mut parent_path = std::path::Path::new(&cwd).parent();
        while let Some(parent) = parent_path {
            let parent_str = parent.to_string_lossy().to_string();
            if let Some(cmds) = history.directories.get(&parent_str) {
                for cmd in cmds.iter().rev() {
                    if cmd.starts_with(&prefix) && !results.contains(cmd) {
                        results.push(cmd.clone());
                    }
                }
            }
            if !results.is_empty() {
                break; // Found suggestions in a parent, stop searching higher
            }
            parent_path = parent.parent();
        }
    }

    Ok(results)
}

#[tauri::command]
pub fn clear_history(app: AppHandle, state: State<'_, HistoryState>) -> Result<(), String> {
    let mut history = state.0.lock().unwrap();
    history.directories.clear();
    
    // Persist to disk
    if let Ok(path) = get_history_path(&app) {
        if let Ok(json) = serde_json::to_string(&*history) {
            let _ = fs::write(path, json);
        }
    }
    
    Ok(())
}
