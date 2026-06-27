import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { LigaturesAddon } from "@xterm/addon-ligatures";
import { spawnPty, writePty, resizePty, killPty, onPtyOutput } from "./ptyClient";
import { sendPaneNotification } from "./notifications";
import { themes, Settings } from "./theme";
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from "./store";

export interface TerminalInstance {
  terminal: Terminal;
  fitAddon: FitAddon;
  domElement: HTMLElement;
  ghostElement: HTMLElement;
  ptyId: string | null;
  unlisten: (() => void) | null;
  unlistenExit: (() => void) | null;
  cwdInterval: number;
  disposed: boolean;
  watched: boolean;
  tabId: string;
  paneId: string;
  cwd?: string;
  currentSuggestion?: string;
}

const registry = new Map<string, TerminalInstance>();

export const TerminalRegistry = {
  get: (paneId: string) => registry.get(paneId),

  create: (
    paneId: string,
    tabId: string,
    initialCwd: string,
    settings: Settings
  ) => {
    if (registry.has(paneId)) return registry.get(paneId)!;

    const themeColors = themes[settings.themeId]?.colors || themes['default'].colors;
    
    const terminal = new Terminal({
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      cursorStyle: settings.cursorStyle,
      cursorBlink: settings.cursorBlink,
      theme: { ...themeColors },
      allowProposedApi: true,
    });

    const domElement = document.createElement('div');
    domElement.className = "w-full h-full";
    // Important: we don't apply paddings here if the parent does, but we can just use 100%

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(domElement);

    // Ligatures addon MUST be loaded after open
    try {
      const ligaturesAddon = new LigaturesAddon();
      terminal.loadAddon(ligaturesAddon);
    } catch (err) {
      console.warn("Failed to load ligatures addon:", err);
    }

    const ghostElement = document.createElement("div");
    ghostElement.style.position = "absolute";
    ghostElement.style.pointerEvents = "none";
    ghostElement.style.color = "#666";
    ghostElement.style.whiteSpace = "pre";
    ghostElement.style.zIndex = "10";
    ghostElement.style.fontFamily = settings.fontFamily;
    ghostElement.style.fontSize = `${settings.fontSize}px`;
    ghostElement.style.lineHeight = "normal";
    
    // We wrap domElement and ghostElement in a container so we can position ghost text
    const containerElement = document.createElement("div");
    containerElement.style.position = "relative";
    containerElement.style.width = "100%";
    containerElement.style.height = "100%";
    containerElement.appendChild(domElement);
    containerElement.appendChild(ghostElement);

    const instance: TerminalInstance = {
      terminal,
      fitAddon,
      domElement: containerElement,
      ghostElement,
      ptyId: null,
      unlisten: null,
      unlistenExit: null,
      cwdInterval: 0,
      disposed: false,
      watched: false,
      tabId,
      paneId,
    };
    registry.set(paneId, instance);

    // Title change sync
    terminal.onTitleChange((title) => {
      if (title && title.trim().length > 0) {
        useAppStore.getState().updateTabTitle(tabId, title);
      }
    });

    // Bell detection — fire notification if this pane is watched
    terminal.onBell(() => {
      if (instance.watched) {
        const settings = useAppStore.getState().settings;
        if (settings.notificationsEnabled) {
          sendPaneNotification(
            tabId,
            paneId,
            "Terminal Bell",
            `A terminal in your workspace needs attention.`
          );
        }
      }
    });

    // Custom Key Handler
    terminal.attachCustomKeyEventHandler((event) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      // Copy (Ctrl+Shift+C or Cmd+C)
      if ((!isMac && event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'c') || 
          (isMac && event.metaKey && event.key.toLowerCase() === 'c')) {
        if (event.type === 'keydown') {
          const selection = terminal.getSelection();
          if (selection) {
            navigator.clipboard.writeText(selection);
            terminal.clearSelection();
          }
        }
        return false;
      }

      // Smart Ctrl+C (Copy if selected, else interrupt)
      if (!isMac && event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'c') {
        const settings = useAppStore.getState().settings;
        if (settings.smartCtrlC) {
          const selection = terminal.getSelection();
          if (selection) {
            if (event.type === 'keydown') {
              navigator.clipboard.writeText(selection);
              terminal.clearSelection();
            }
            return false; // prevent default, don't send interrupt
          }
        }
      }

      // Paste
      if ((!isMac && event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'v') || 
          (isMac && event.metaKey && event.key.toLowerCase() === 'v')) {
        if (event.type === 'keydown') {
          navigator.clipboard.readText().then((text) => {
            if (instance.ptyId) {
              const encoder = new TextEncoder();
              writePty(instance.ptyId, encoder.encode(text));
            }
          }).catch(err => console.error("Paste failed:", err));
          return false;
        }
      }

      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (mod) {
        const key = event.key.toLowerCase();
        if (['t', 'w', 'd', 'k', ','].includes(key) || (key >= '1' && key <= '9')) {
          if (event.type === 'keydown') {
            event.preventDefault();
            event.stopPropagation();
            const state = useAppStore.getState();
            if (key === 't') state.addTab();
            else if (key === 'w') {
              if (state.activeTabId && paneId) state.closePane(paneId);
            }
            else if (key === 'd') {
              if (state.activeTabId && paneId) state.splitPane(event.shiftKey ? 'horizontal' : 'vertical');
            }
            else if (key === 'k') state.toggleWorkspaceSwitcher();
            else if (key === ',') state.toggleSettings();
            else if (key >= '1' && key <= '9') {
              const idx = parseInt(key) - 1;
              if (state.tabs[idx]) state.setActiveTab(state.tabs[idx].id);
            }
          }
          return false;
        }
      }
      return true;
    });

    const encoder = new TextEncoder();
    terminal.onData((data) => {
      if (instance.ptyId) {
        if (data === '\r') {
          // User hit enter, extract the command from the current line
          const buffer = terminal.buffer.active;
          const lineY = buffer.cursorY + buffer.baseY;
          const line = buffer.getLine(lineY);
          if (line) {
            const text = line.translateToString(true);
            const match = text.match(/(?:[\$#>%]|\u27F6)\s+(.*)$/);
            let cmd = match ? match[1] : text.trim();
            if (cmd) {
              invoke('save_command', { cwd: instance.cwd || '.', command: cmd }).catch(console.error);
            }
          }
          // Clear suggestion
          instance.currentSuggestion = undefined;
          instance.ghostElement.textContent = "";
        } else if ((data === '\t' || data === '\x1b[C') && instance.currentSuggestion) {
          // Tab or Right-Arrow completes the suggestion
          writePty(instance.ptyId, encoder.encode(instance.currentSuggestion));
          instance.currentSuggestion = undefined;
          instance.ghostElement.textContent = "";
          return;
        }
        
        writePty(instance.ptyId, encoder.encode(data));
      }
    });

    // Update ghost text overlay on every terminal render or cursor move
    terminal.onCursorMove(async () => {
      if (!instance.ptyId) return;
      const buffer = terminal.buffer.active;
      const lineY = buffer.cursorY + buffer.baseY;
      const line = buffer.getLine(lineY);
      
      instance.ghostElement.textContent = "";
      instance.currentSuggestion = undefined;
      
      if (line) {
        const text = line.translateToString(true);
        const match = text.match(/(?:[\$#>%]|\u27F6)\s+(.*)$/);
        
        // Only fetch suggestions if we are at the end of the line
        if (match && buffer.cursorX >= text.length) {
          const prefix = match[1];
          if (prefix.length > 0) {
            try {
              const suggestions = await invoke<string[]>('get_suggestions', { cwd: instance.cwd || '.', prefix });
              if (suggestions && suggestions.length > 0) {
                const suggestion = suggestions[0];
                const remaining = suggestion.substring(prefix.length);
                if (remaining.length > 0) {
                  instance.currentSuggestion = remaining;
                  
                  // Position the ghost text exactly over the cursor
                  // Use a small timeout to allow xterm.js to render the updated cursor position in the DOM
                  setTimeout(() => {
                    if (instance.currentSuggestion !== remaining) return;
                    const cursorNode = terminal.element?.querySelector('.xterm-cursor');
                    if (cursorNode) {
                      const rect = cursorNode.getBoundingClientRect();
                      const termRect = instance.domElement.getBoundingClientRect();
                      instance.ghostElement.textContent = remaining;
                      instance.ghostElement.style.left = `${rect.left - termRect.left}px`;
                      instance.ghostElement.style.top = `${rect.top - termRect.top}px`;
                    }
                  }, 20);
                }
              }
            } catch (e) {
              // Ignore
            }
          }
        }
      }
    });

    (async () => {
      try {
        instance.ptyId = await spawnPty(initialCwd || ".");
        if (instance.disposed) {
          killPty(instance.ptyId);
          return;
        }

        instance.unlisten = await onPtyOutput(instance.ptyId, (bytes) => {
          instance.terminal.write(bytes);
        });

        // Listen for process exit — notify if watched and runtime exceeds threshold
        const exitUnlisten = await listen<number>(`pty-exited-${instance.ptyId}`, (event) => {
          const runtimeSecs = event.payload;
          if (instance.watched) {
            const settings = useAppStore.getState().settings;
            if (settings.notificationsEnabled && runtimeSecs >= settings.notificationMinRuntime) {
              sendPaneNotification(
                tabId,
                paneId,
                "Process Finished",
                `A long-running process exited after ${runtimeSecs}s.`
              );
            }
          }
        });
        instance.unlistenExit = exitUnlisten;

        resizePty(instance.ptyId, terminal.rows, terminal.cols);
      } catch (err) {
        console.error("Failed to spawn PTY:", err);
        terminal.write(`\r\n\x1b[31mFailed to spawn PTY: ${err}\x1b[0m\r\n`);
      }
    })();

    instance.cwdInterval = window.setInterval(async () => {
      if (instance.ptyId && !instance.disposed) {
        try {
          const currentCwd = await invoke<string>('get_pty_cwd', { id: instance.ptyId });
          if (currentCwd && currentCwd !== ".") {
            instance.cwd = currentCwd;
            useAppStore.getState().updatePaneCwd(paneId, currentCwd);
          }
        } catch (e) {}
      }
    }, 5000);

    return instance;
  },

  destroy: (paneId: string) => {
    const instance = registry.get(paneId);
    if (instance) {
      instance.disposed = true;
      window.clearInterval(instance.cwdInterval);
      if (instance.unlisten) instance.unlisten();
      if (instance.unlistenExit) instance.unlistenExit();
      if (instance.ptyId) killPty(instance.ptyId).catch(() => {});
      instance.terminal.dispose();
      instance.domElement.remove();
      registry.delete(paneId);
    }
  },

  destroyAllExcept: (activePaneIds: Set<string>) => {
    for (const paneId of registry.keys()) {
      if (!activePaneIds.has(paneId)) {
        TerminalRegistry.destroy(paneId);
      }
    }
  },

  updateSettings: (settings: Settings) => {
    const themeColors = themes[settings.themeId]?.colors || themes['default'].colors;
    for (const instance of registry.values()) {
      instance.terminal.options.fontFamily = settings.fontFamily;
      instance.terminal.options.fontSize = settings.fontSize;
      instance.terminal.options.cursorStyle = settings.cursorStyle;
      instance.terminal.options.cursorBlink = settings.cursorBlink;
      instance.terminal.options.theme = { ...themeColors };
      // Note: Fit will be called by resize observers in the views
    }
  },

  setWatched: (paneId: string, watched: boolean) => {
    const instance = registry.get(paneId);
    if (instance) {
      instance.watched = watched;
    }
  },

  isWatched: (paneId: string): boolean => {
    return registry.get(paneId)?.watched ?? false;
  },
};
