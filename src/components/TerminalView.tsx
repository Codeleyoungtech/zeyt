import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useAppStore } from "../lib/store";
import { themes } from "../lib/theme";
import { invoke } from '@tauri-apps/api/core';

import {
  spawnPty,
  writePty,
  resizePty,
  killPty,
  onPtyOutput,
} from "../lib/ptyClient";

export interface TerminalViewProps {
  tabId: string;
  paneId: string;
  initialCwd?: string;
}

export default function TerminalView({ tabId, paneId, initialCwd }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const updateTabTitle = useAppStore(state => state.updateTabTitle);
  const activeTabId = useAppStore(state => state.activeTabId);
  const settings = useAppStore(state => state.settings);

  // We need a ref to access the terminal instance later for settings updates
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddonInstance = useRef<FitAddon | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const themeColors = themes[settings.themeId]?.colors || themes['default'].colors;

    // ── Terminal + FitAddon ──────────────────────────────────
    const terminal = new Terminal({
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      cursorStyle: settings.cursorStyle,
      cursorBlink: settings.cursorBlink,
      theme: {
        background: themeColors.background,
        foreground: themeColors.foreground,
        cursor: themeColors.cursor,
        cursorAccent: themeColors.cursorAccent,
        selectionBackground: themeColors.selectionBackground,
        black: themeColors.black,
        red: themeColors.red,
        green: themeColors.green,
        yellow: themeColors.yellow,
        blue: themeColors.blue,
        magenta: themeColors.magenta,
        cyan: themeColors.cyan,
        white: themeColors.white,
        brightBlack: themeColors.brightBlack,
        brightRed: themeColors.brightRed,
        brightGreen: themeColors.brightGreen,
        brightYellow: themeColors.brightYellow,
        brightBlue: themeColors.brightBlue,
        brightMagenta: themeColors.brightMagenta,
        brightCyan: themeColors.brightCyan,
        brightWhite: themeColors.brightWhite,
      },
      allowProposedApi: true,
    });
    
    terminalInstance.current = terminal;

    // Handle focus (avoid stale closures by using getState)
    container.addEventListener('mousedown', () => {
      const state = useAppStore.getState();
      if (state.activeTabId === tabId) {
        state.setActivePane(paneId);
      }
    });

    // Automatically update the Tab's title when the shell emits a title change escape sequence (OSC 0/1/2)
    const onTitleChangeDisposable = terminal.onTitleChange((title) => {
      if (title && title.trim().length > 0) {
        updateTabTitle(tabId, title);
      }
    });

    terminal.attachCustomKeyEventHandler((event) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      // Copy: Ctrl+Shift+C (Windows/Linux) or Cmd+C (Mac)
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

      // Paste: Ctrl+Shift+V (Windows/Linux) or Cmd+V (Mac)
      if ((!isMac && event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'v') || 
          (isMac && event.metaKey && event.key.toLowerCase() === 'v')) {
        if (event.type === 'keydown') {
          navigator.clipboard.readText().then((text) => {
            if (ptyId) {
              writePty(ptyId, encoder.encode(text));
            }
          }).catch(err => {
            console.error("Paste failed:", err);
          });
          return false;
        }
      }

      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (mod) {
        const key = event.key.toLowerCase();
        
        // Execute global shortcuts locally to prevent xterm from swallowing them or bubbling poorly
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
          return false; // Prevent xterm processing
        }
      }

      return true;
    });

    const fitAddon = new FitAddon();
    fitAddonInstance.current = fitAddon;
    terminal.loadAddon(fitAddon);
    terminal.open(container);

    // Delay the initial fit so the container has a real size
    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    // ── PTY lifecycle ───────────────────────────────────────
    let ptyId: string | null = null;
    let unlisten: (() => void) | null = null;
    let disposed = false;

    const encoder = new TextEncoder();

    // Forward terminal keyboard input → PTY
    const onDataDisposable = terminal.onData((data) => {
      if (ptyId) {
        writePty(ptyId, encoder.encode(data));
      }
    });

    // Spawn PTY and wire output
    const cwd = initialCwd ?? ".";

    (async () => {
      try {
        ptyId = await spawnPty(cwd);
        if (disposed) {
          // Component unmounted before spawn resolved
          killPty(ptyId);
          return;
        }

        unlisten = await onPtyOutput(ptyId, (bytes) => {
          terminal.write(bytes);
        });

        // Send the initial size to the backend
        resizePty(ptyId, terminal.rows, terminal.cols);
      } catch (err) {
        console.error("[TerminalView] Failed to spawn PTY:", err);
        terminal.write(`\r\n\x1b[31mFailed to spawn PTY: ${err}\x1b[0m\r\n`);
      }
    })();

    // ── CWD Polling ─────────────────────────────────────────
    const cwdInterval = setInterval(async () => {
      if (ptyId) {
        try {
          const cwd = await invoke<string>('get_pty_cwd', { id: ptyId });
          if (cwd && cwd !== ".") {
            useAppStore.getState().updatePaneCwd(paneId, cwd);
          }
        } catch (e) {
          // Ignore errors
        }
      }
    }, 5000);

    // ── Resize handling ─────────────────────────────────────
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      if (ptyId) {
        resizePty(ptyId, terminal.rows, terminal.cols);
      }
    });
    resizeObserver.observe(container);

    // ── Cleanup ─────────────────────────────────────────────
    return () => {
      disposed = true;
      clearInterval(cwdInterval);
      resizeObserver.disconnect();
      onDataDisposable.dispose();
      onTitleChangeDisposable.dispose();

      if (unlisten) unlisten();
      if (ptyId) killPty(ptyId).catch(() => {});

      terminalInstance.current = null;
      fitAddonInstance.current = null;
      terminal.dispose();
    };
  }, [initialCwd, tabId, paneId]); // Empty-ish dependency array, we only re-run if these fundamental identity props change

  // ── Watch Settings Changes ───────────────────────────────
  useEffect(() => {
    const terminal = terminalInstance.current;
    const fitAddon = fitAddonInstance.current;
    if (!terminal || !fitAddon) return;

    terminal.options.fontFamily = settings.fontFamily;
    terminal.options.fontSize = settings.fontSize;
    terminal.options.cursorStyle = settings.cursorStyle;
    terminal.options.cursorBlink = settings.cursorBlink;

    const themeColors = themes[settings.themeId]?.colors || themes['default'].colors;
    terminal.options.theme = {
        background: themeColors.background,
        foreground: themeColors.foreground,
        cursor: themeColors.cursor,
        cursorAccent: themeColors.cursorAccent,
        selectionBackground: themeColors.selectionBackground,
        black: themeColors.black,
        red: themeColors.red,
        green: themeColors.green,
        yellow: themeColors.yellow,
        blue: themeColors.blue,
        magenta: themeColors.magenta,
        cyan: themeColors.cyan,
        white: themeColors.white,
        brightBlack: themeColors.brightBlack,
        brightRed: themeColors.brightRed,
        brightGreen: themeColors.brightGreen,
        brightYellow: themeColors.brightYellow,
        brightBlue: themeColors.brightBlue,
        brightMagenta: themeColors.brightMagenta,
        brightCyan: themeColors.brightCyan,
        brightWhite: themeColors.brightWhite,
    };

    // Refit because font size or family changes layout
    requestAnimationFrame(() => {
      fitAddon.fit();
    });
  }, [settings]);

  const activePaneId = useAppStore(state => {
    const tab = state.tabs.find(t => t.id === tabId);
    return tab?.activePaneId;
  });
  const isActive = activeTabId === tabId && activePaneId === paneId;

  return (
    <div 
      className="w-full h-full flex flex-col overflow-hidden bg-[#1a1a1e]"
      onMouseDown={() => {
        const state = useAppStore.getState();
        if (state.activeTabId === tabId) {
          state.setActivePane(paneId);
        }
      }}
    >
      <style>{`
        /* Glowing cursor only for active pane */
        ${isActive ? `
        .terminal-${paneId} .xterm-cursor-block {
          background-color: var(--brand) !important;
          box-shadow: 0 0 10px var(--brand);
          color: #000 !important;
        }
        ` : ''}
      `}</style>
      <div
        ref={containerRef}
        className={`flex-1 w-full min-h-0 terminal-${paneId}`}
        style={{ padding: '4px' }}
      />
    </div>
  );
}
