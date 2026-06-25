import { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';

export default function TabBar() {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab, updateTabTitle, closePane, splitPane } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Global keyboard shortcuts for tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod) {
        if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          addTab();
        } else if (e.key.toLowerCase() === 'w') {
          e.preventDefault();
          const state = useAppStore.getState();
          const activeTab = state.tabs.find(t => t.id === state.activeTabId);
          if (activeTab) {
            closePane(activeTab.activePaneId);
          }
        } else if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          splitPane(e.shiftKey ? 'horizontal' : 'vertical');
        } else if (e.key >= '1' && e.key <= '9') {
          const index = parseInt(e.key) - 1;
          if (index < tabs.length) {
            e.preventDefault();
            setActiveTab(tabs[index].id);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, addTab, closeTab, setActiveTab]);

  return (
    <div className="h-9 w-full bg-[#1e1e1e] border-b border-[#333333] flex items-center shrink-0 px-2 select-none overflow-x-auto no-scrollbar">
      <div className="flex items-center h-full gap-1 w-full min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onAuxClick={(e) => {
                if (e.button === 1) closeTab(tab.id); // Middle click
              }}
              onDoubleClick={() => setEditingId(tab.id)}
              className={`group flex items-center h-[28px] max-w-[200px] min-w-[60px] flex-1 shrink rounded-md px-3 cursor-pointer text-sm transition-colors border border-transparent ${
                isActive
                  ? 'bg-[#2d2d2d] text-white shadow-sm border-[#3e3e3e]'
                  : 'text-[#888888] hover:bg-[#252525] hover:text-[#cccccc]'
              }`}
            >
              <div className="flex-1 truncate mr-2">
                {editingId === tab.id ? (
                  <input
                    autoFocus
                    defaultValue={tab.title}
                    onBlur={(e) => {
                      updateTabTitle(tab.id, e.target.value || 'Terminal');
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateTabTitle(tab.id, e.currentTarget.value || 'Terminal');
                        setEditingId(null);
                      } else if (e.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                    className="w-full bg-transparent outline-none text-white"
                  />
                ) : (
                  tab.title
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className={`w-5 h-5 flex items-center justify-center rounded hover:bg-[#444444] transition-colors ${
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          );
        })}
        
        <button 
          onClick={addTab}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#333333] transition-colors group ml-2"
          title="New Tab (Ctrl+T)"
        >
          <svg className="w-4 h-4 text-[#888888] group-hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      <div className="flex items-center px-2 border-l border-[#333333]">
        <button 
          onClick={() => useAppStore.getState().toggleWorkspaceSwitcher()}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#333333] transition-colors group mr-1"
          title="Workspaces (Ctrl+K)"
        >
          <svg className="w-4 h-4 text-[#888888] group-hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
        <button 
          onClick={() => useAppStore.getState().toggleSettings()}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#333333] transition-colors group"
          title="Settings"
        >
          <svg className="w-4 h-4 text-[#888888] group-hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}
