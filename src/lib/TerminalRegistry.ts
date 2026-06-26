import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { spawnPty, writePty, resizePty, killPty, onPtyOutput } from "./ptyClient";
import { themes, Settings } from "./theme";
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from "./store";

export interface TerminalInstance {
  terminal: Terminal;
  fitAddon: FitAddon;
  domElement: HTMLDivElement;
  ptyId: string | null;
  unlisten: (() => void) | null;
  cwdInterval: number;
  disposed: boolean;
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

    const instance: TerminalInstance = {
      terminal,
      fitAddon,
      domElement,
      ptyId: null,
      unlisten: null,
      cwdInterval: 0,
      disposed: false,
    };
    registry.set(paneId, instance);

    // Title change sync
    terminal.onTitleChange((title) => {
      if (title && title.trim().length > 0) {
        useAppStore.getState().updateTabTitle(tabId, title);
      }
    });

    // Custom Key Handler
    terminal.attachCustomKeyEventHandler((event) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      // Copy
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
        writePty(instance.ptyId, encoder.encode(data));
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
  }
};
