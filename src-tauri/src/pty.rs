use portable_pty::{native_pty_system, CommandBuilder, PtySize, MasterPty, Child};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{LazyLock, Mutex};
use tauri::Emitter;
use uuid::Uuid;

/// Holds the master PTY handle (for resize), writer (for input), and child process (for kill).
struct PtySession {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn Child + Send + Sync>,
}

static PTY_REGISTRY: LazyLock<Mutex<HashMap<String, PtySession>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// Spawns a new PTY session and returns its UUID.
///
/// The shell is determined from $SHELL, falling back to /bin/bash.
/// A background thread reads output and emits `pty-output-{id}` events with `Vec<u8>` payloads.
#[tauri::command]
pub fn spawn_pty(app: tauri::AppHandle, cwd: String) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();

    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());

    let pty_system = native_pty_system();

    let pty_size = PtySize {
        rows: 24,
        cols: 80,
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system
        .openpty(pty_size)
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    let mut cmd = CommandBuilder::new(&shell);
    cmd.cwd(&cwd);
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn command: {}", e))?;

    // Drop slave — we only interact via the master side
    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone reader: {}", e))?;

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to take writer: {}", e))?;

    // Store session in registry
    {
        let mut registry = PTY_REGISTRY.lock().map_err(|e| format!("Lock error: {}", e))?;
        registry.insert(
            id.clone(),
            PtySession {
                master: pair.master,
                writer,
                child,
            },
        );
    }

    // Spawn reader thread that emits output events
    let event_id = id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break, // EOF
                Ok(n) => {
                    let data = buf[..n].to_vec();
                    let event_name = format!("pty-output-{}", event_id);
                    if app.emit(&event_name, data).is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    });

    Ok(id)
}

/// Writes data to the PTY identified by `id`.
#[tauri::command]
pub fn write_pty(id: String, data: Vec<u8>) -> Result<(), String> {
    let mut registry = PTY_REGISTRY.lock().map_err(|e| format!("Lock error: {}", e))?;
    let session = registry
        .get_mut(&id)
        .ok_or_else(|| format!("PTY session not found: {}", id))?;

    session
        .writer
        .write_all(&data)
        .map_err(|e| format!("Write error: {}", e))?;

    session
        .writer
        .flush()
        .map_err(|e| format!("Flush error: {}", e))?;

    Ok(())
}

/// Resizes the PTY identified by `id` to the given dimensions.
#[tauri::command]
pub fn resize_pty(id: String, rows: u16, cols: u16) -> Result<(), String> {
    let registry = PTY_REGISTRY.lock().map_err(|e| format!("Lock error: {}", e))?;
    let session = registry
        .get(&id)
        .ok_or_else(|| format!("PTY session not found: {}", id))?;

    session
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Resize error: {}", e))?;

    Ok(())
}

/// Kills the PTY session identified by `id`, terminating the child process
/// and removing the session from the registry.
#[tauri::command]
pub fn kill_pty(id: String) -> Result<(), String> {
    let mut registry = PTY_REGISTRY.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut session = registry
        .remove(&id)
        .ok_or_else(|| format!("PTY session not found: {}", id))?;

    // Kill the child process. This also causes the reader thread to get EOF and exit.
    session
        .child
        .kill()
        .map_err(|e| format!("Kill error: {}", e))?;

    // Wait for the child to fully terminate to avoid zombies
    let _ = session.child.wait();

    // master + writer are dropped here when session goes out of scope

    Ok(())
}

/// Gets the current working directory of the PTY session by inspecting /proc/{pid}/cwd
#[tauri::command]
pub fn get_pty_cwd(id: String) -> Result<String, String> {
    let registry = PTY_REGISTRY.lock().map_err(|e| format!("Lock error: {}", e))?;
    if let Some(session) = registry.get(&id) {
        if let Some(pid) = session.child.process_id() {
            #[cfg(target_os = "linux")]
            {
                if let Ok(cwd) = std::fs::read_link(format!("/proc/{}/cwd", pid)) {
                    return Ok(cwd.to_string_lossy().to_string());
                }
            }
        }
    }
    Ok(".".to_string())
}
