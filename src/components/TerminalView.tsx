import { useRef, useLayoutEffect, useState, useEffect } from "react";
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
  const searchPaneId = useAppStore(state => state.searchPaneId);
  const setSearchPane = useAppStore(state => state.setSearchPane);

  const isSearchActive = searchPaneId === paneId;
  const [searchText, setSearchText] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchActive && searchInputRef.current) {
      searchInputRef.current.focus();
    } else if (!isSearchActive) {
      // Clear search results visually when closed
      const termInstance = TerminalRegistry.get(paneId);
      termInstance?.searchAddon.clearDecorations();
    }
  }, [isSearchActive, paneId]);

  const handleSearch = (direction: 'next' | 'prev') => {
    const termInstance = TerminalRegistry.get(paneId);
    if (!termInstance || !searchText) return;
    
    if (direction === 'next') {
      termInstance.searchAddon.findNext(searchText);
    } else {
      termInstance.searchAddon.findPrevious(searchText);
    }
  };

  // LayoutEffect ensures the DOM element is attached before paint
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const termInstance = TerminalRegistry.create(paneId, tabId, initialCwd || ".", settings);
    
    // Append the global terminal DOM element to our React container
    container.appendChild(termInstance.domElement);

    let animationFrameId: number;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        try {
          termInstance.fitAddon.fit();
          if (termInstance.ptyId) {
            resizePty(termInstance.ptyId, termInstance.terminal.rows, termInstance.terminal.cols);
          }
        } catch (e) {
          // Ignore errors if terminal is disposed during resize
        }
      });
    });
    resizeObserver.observe(container);

    // Initial fit
    requestAnimationFrame(() => {
      termInstance.fitAddon.fit();
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
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
      className="w-full h-full flex flex-col overflow-hidden bg-[var(--bg-base)]"
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
        className={`flex-1 w-full min-w-0 min-h-0 pl-3 pt-2 overflow-hidden terminal-${paneId}`}
      />
      
      {/* Search Overlay */}
      {isSearchActive && (
        <div className="absolute top-2 right-4 z-50 flex items-center bg-[var(--bg-surface-3)] border border-[var(--border-highlight)] rounded-md shadow-xl p-1 gap-1 animate-[fadeIn_0.15s_ease-out]">
          <input
            ref={searchInputRef}
            type="text"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              const termInstance = TerminalRegistry.get(paneId);
              if (termInstance && e.target.value) {
                termInstance.searchAddon.findNext(e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchPane(null);
              if (e.key === 'Enter') handleSearch(e.shiftKey ? 'prev' : 'next');
            }}
            placeholder="Find in terminal..."
            className="bg-transparent border-none outline-none text-[var(--text-primary)] text-[13px] w-48 px-2 py-1"
          />
          <div className="w-[1px] h-4 bg-[var(--border-focus)] mx-1" />
          <button 
            onClick={() => handleSearch('prev')}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--border-focus)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Previous (Shift+Enter)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 15l-6-6-6 6"/>
            </svg>
          </button>
          <button 
            onClick={() => handleSearch('next')}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--border-focus)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Next (Enter)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
          <button 
            onClick={() => setSearchPane(null)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--border-focus)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ml-1"
            title="Close (Esc)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
