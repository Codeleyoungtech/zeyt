import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/**
 * Spawn a new PTY process in the given working directory.
 * Returns the unique PTY identifier.
 */
export async function spawnPty(cwd: string): Promise<string> {
  return invoke<string>("spawn_pty", { cwd });
}

/**
 * Write raw bytes to a running PTY.
 * Tauri commands cannot transfer `Uint8Array` directly,
 * so we serialise to a plain number array.
 */
export async function writePty(id: string, data: Uint8Array): Promise<void> {
  return invoke("write_pty", { id, data: Array.from(data) });
}

/**
 * Notify the PTY of a terminal resize.
 */
export async function resizePty(
  id: string,
  rows: number,
  cols: number,
): Promise<void> {
  return invoke("resize_pty", { id, rows, cols });
}

/**
 * Kill a running PTY process.
 */
export async function killPty(id: string): Promise<void> {
  return invoke("kill_pty", { id });
}

/**
 * Subscribe to output events from a specific PTY.
 * The backend emits events named `pty-output-{id}` whose payload
 * is a `number[]`; we convert it back to `Uint8Array` for xterm.
 */
export async function onPtyOutput(
  id: string,
  callback: (data: Uint8Array) => void,
): Promise<UnlistenFn> {
  return listen<number[]>(`pty-output-${id}`, (event) => {
    callback(new Uint8Array(event.payload));
  });
}
