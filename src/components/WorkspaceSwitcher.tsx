import { useAppStore, Workspace } from '../lib/store';
import { open } from '@tauri-apps/plugin-dialog';
import { useState, useRef, useEffect } from 'react';

export default function WorkspaceSidebar() {
  const {
    isWorkspaceSwitcherOpen,
    toggleWorkspaceSwitcher,
    workspaces,
    activeWorkspaceId,
    switchWorkspace,
    createWorkspace,
    deleteWorkspace,
    renameWorkspace,
    toggleWorkspaceFavorite,
    reorderWorkspaces,
    settings,
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const mode = settings?.workspaceSwitcherMode || 'overlay';
  const isOpen = mode === 'sidebar' ? true : isWorkspaceSwitcherOpen;

  useEffect(() => {
    if (isWorkspaceSwitcherOpen && mode === 'overlay') {
      setSearch('');
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isWorkspaceSwitcherOpen, mode]);

  if (!isOpen) return null;

  // Preserve user order, just filter by search
  const filtered = workspaces.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.rootPath.toLowerCase().includes(search.toLowerCase())
  );

  const handleBrowseFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Workspace Folder',
      });
      if (selected && typeof selected === 'string') {
        createWorkspace(selected);
      }
    } catch (e) {
      console.error('Folder picker error:', e);
    }
  };

  const startRename = (w: Workspace) => {
    setEditingId(w.id);
    setEditName(w.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      renameWorkspace(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const sidebarContent = (
      <div 
        className={`h-full bg-[#151515] border-r border-[#2a2a2a] flex flex-col ${mode === 'overlay' ? 'w-[280px] shadow-2xl animate-[slideIn_0.2s_ease-out]' : 'w-[240px]'}`}
        style={mode === 'overlay' ? { boxShadow: '4px 0 24px rgba(0,0,0,0.5)' } : {}}
      >
        {/* Search Header */}
        <div className="px-4 py-4 shrink-0 border-b border-[#222]">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-[#222] rounded-md px-3 py-1.5 border border-transparent focus-within:border-[#444] transition-colors">
              <svg className="w-3.5 h-3.5 text-[#777] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="workspace-sidebar-search"
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find workspace..."
                className="flex-1 bg-transparent outline-none text-[13px] text-[#e0e0e0] placeholder-[#666]"
              />
            </div>
            <button
              onClick={handleBrowseFolder}
              title="Add folder to workspaces"
              className="w-[34px] h-[34px] shrink-0 flex items-center justify-center rounded-md bg-transparent text-[var(--brand)] hover:bg-[#2a2a2a] transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Workspace list */}
        <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] text-[#666]">No workspaces yet</p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="px-4 mb-2 mt-1">
              <span className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Workspaces</span>
            </div>
          )}

          <div className="px-2">
            {filtered.map((w) => {
              const isActive = w.id === activeWorkspaceId;
              const isEditing = editingId === w.id;

              return (
                <div
                  key={w.id}
                  draggable={!isEditing && search === ''}
                  onDragStart={() => setDraggedId(w.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedId && draggedId !== w.id) {
                      reorderWorkspaces(draggedId, w.id);
                    }
                    setDraggedId(null);
                  }}
                  className={`group relative flex items-center h-8 mb-0.5 rounded-md cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[#252525] text-[#e0e0e0]'
                      : 'text-[#999] hover:bg-[#222] hover:text-[#d0d0d0]'
                  } ${draggedId === w.id ? 'opacity-50' : ''}`}
                  onClick={() => {
                    if (!isEditing) {
                      switchWorkspace(w.id);
                    }
                  }}
                  title={w.rootPath}
                >
                  {/* Left accent bar for active */}
                  {isActive && <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#e0e0e0] rounded-r-md" />}

                  <div className="pl-3 pr-4 flex items-center gap-3 w-full">
                    {/* Folder icon */}
                    <svg className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#e0e0e0]' : 'text-[#666]'}`} style={{ marginLeft: '8px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-[#111] border border-[#444] rounded px-1.5 py-0.5 text-[13px] text-white outline-none focus:border-[#777]"
                        />
                      ) : (
                        <div className={`text-[13px] truncate ${isActive ? 'font-medium' : 'font-normal'}`}>
                          {w.name}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleWorkspaceFavorite(w.id); }}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#333] transition-colors"
                      >
                        <svg className={`w-3 h-3 ${w.favorite ? 'text-[#e0e0e0] fill-[#e0e0e0]' : 'text-[#777]'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); startRename(w); }}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#333] transition-colors"
                      >
                        <svg className="w-3 h-3 text-[#777] hover:text-[#d0d0d0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove workspace "${w.name}"?`)) {
                            deleteWorkspace(w.id);
                          }
                        }}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#333] transition-colors"
                      >
                        <svg className="w-3 h-3 text-[#777] hover:text-[#ff5f56]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
  );

  if (mode === 'sidebar') {
    return sidebarContent;
  }

  return (
    <div
      className="absolute inset-0 z-50 flex bg-black/40 backdrop-blur-[4px] transition-all duration-300"
      onMouseDown={(e) => { if (e.target === e.currentTarget) toggleWorkspaceSwitcher(); }}
    >
      {sidebarContent}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
