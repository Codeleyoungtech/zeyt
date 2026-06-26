import { useRef, useLayoutEffect } from "react";
import { useAppStore } from "../lib/store";
import { TerminalRegistry } from "../lib/TerminalRegistry";
import { resizePty } from "../lib/ptyClient";
import "@xterm/xterm/css/xterm.css";

export interface TerminalViewProps {
  tabId: string;
  paneId: string;
  initialCwd?: string;
}

export default function TerminalView({ tabId, paneId, initialCwd }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabId = useAppStore(state => state.activeTabId);
  const settings = useAppStore(state => state.settings);

  // LayoutEffect ensures the DOM element is attached before paint
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const termInstance = TerminalRegistry.create(paneId, tabId, initialCwd || ".", settings);
    
    // Append the global terminal DOM element to our React container
    container.appendChild(termInstance.domElement);

    const resizeObserver = new ResizeObserver(() => {
      termInstance.fitAddon.fit();
      if (termInstance.ptyId) {
        resizePty(termInstance.ptyId, termInstance.terminal.rows, termInstance.terminal.cols);
      }
    });
    resizeObserver.observe(container);

    // Initial fit
    requestAnimationFrame(() => {
      termInstance.fitAddon.fit();
    });

    return () => {
      resizeObserver.disconnect();
      if (container.contains(termInstance.domElement)) {
        container.removeChild(termInstance.domElement);
      }
    };
  }, [paneId, tabId, initialCwd]); 

  // We handle settings updates globally, but just in case, TerminalRegistry can update all
  // The global useEffect in App.tsx handles Settings updates for the registry.

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

