import { useAppStore, Workspace } from '../lib/store';
import { open } from '@tauri-apps/plugin-dialog';
import { useState, useRef } from 'react';

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
    splitPane,
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const mode = settings?.workspaceSwitcherMode || 'overlay';
  const isOpen = mode === 'sidebar' ? true : isWorkspaceSwitcherOpen;

  if (!isOpen) return null;

  const filteredWorkspaces = workspaces
    .filter(w =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.rootPath.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (a.favorite === b.favorite) return 0;
      return a.favorite ? -1 : 1;
    });

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
        className={`h-full bg-[var(--bg-surface-2)] border-r border-[var(--border-color)] flex flex-col ${mode === 'overlay' ? 'w-[280px] shadow-2xl animate-[slideIn_0.2s_ease-out]' : 'w-[240px]'}`}
        style={mode === 'overlay' ? { boxShadow: '4px 0 24px rgba(0,0,0,0.5)' } : {}}
      >
        {/* Search Header */}
        <div className="px-4 py-4 shrink-0 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 min-w-0 flex items-center gap-2 bg-[var(--bg-surface-3)] rounded-md px-2.5 py-1.5 border border-transparent focus-within:border-[var(--border-focus)] transition-colors">
              <svg className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="workspace-sidebar-search"
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find..."
                className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-[var(--text-primary)] placeholder-[#666]"
              />
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => { splitPane('vertical'); if (mode === 'overlay') toggleWorkspaceSwitcher(); }}
                title="Split Editor Right"
                className="w-7 h-7 flex items-center justify-center rounded-md bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-3)] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="12" y1="3" x2="12" y2="21" />
                </svg>
              </button>
              <button
                onClick={() => { splitPane('horizontal'); if (mode === 'overlay') toggleWorkspaceSwitcher(); }}
                title="Split Editor Down"
                className="w-7 h-7 flex items-center justify-center rounded-md bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-3)] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                </svg>
              </button>
              <button
                onClick={handleBrowseFolder}
                title="Add Folder to Workspace"
                className="w-7 h-7 flex items-center justify-center rounded-md bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-3)] transition-colors ml-1"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Workspace list */}
        <div className="flex-1 overflow-y-auto min-h-0 py-2 custom-scrollbar">

          {filteredWorkspaces.length > 0 && (
            <div className="px-3">
              <div className="text-[10px] font-bold tracking-widest text-[var(--text-dark)] uppercase mb-1 px-2">Workspaces</div>
              {filteredWorkspaces.map(w => {
                const isActive = activeWorkspaceId === w.id;
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
                        ? 'bg-[var(--bg-base)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-3)] hover:text-[var(--text-primary)]'
                    } ${draggedId === w.id ? 'opacity-50' : ''}`}
                    onClick={() => {
                      if (!isEditing) {
                        switchWorkspace(w.id);
                        if (mode === 'overlay') toggleWorkspaceSwitcher();
                      }
                    }}
                    title={w.rootPath}
                  >
                    {/* Left accent bar for active */}
                    {isActive && <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-[var(--text-primary)] rounded-r-md" />}

                    <div className="pl-3 pr-4 flex items-center gap-3 w-full">
                      {/* Folder icon */}
                      <svg className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-dark)]'}`} style={{ marginLeft: '8px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                            className="w-full bg-[var(--bg-surface-3)] border border-[var(--border-focus)] rounded px-1.5 py-0.5 text-[13px] text-white outline-none focus:border-[var(--text-muted)]"
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
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--border-highlight)] transition-colors"
                        >
                          <svg className={`w-3 h-3 ${w.favorite ? 'text-[var(--text-primary)] fill-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); startRename(w); }}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--border-highlight)] transition-colors"
                        >
                          <svg className="w-3 h-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--border-highlight)] transition-colors"
                        >
                          <svg className="w-3 h-3 text-[var(--text-muted)] hover:text-[#ff5f56]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {filteredWorkspaces.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full px-5 text-center pb-10">
              <button
                onClick={handleBrowseFolder}
                className="w-16 h-16 mb-4 rounded-full bg-[var(--bg-base)] hover:bg-[var(--border-highlight)] border border-[var(--border-color)] hover:border-[var(--border-focus)] flex items-center justify-center text-[var(--text-dark)] hover:text-[var(--text-primary)] transition-all group"
                title="Add Workspace Folder"
              >
                <svg className="w-7 h-7 transform group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
              </button>
              <p className="text-[13px] font-medium text-[var(--text-primary)] mb-1">No workspaces found</p>
              <p className="text-[12px] text-[var(--text-dark)]">
                {search ? "Try adjusting your search terms." : "Click to add a folder"}
              </p>
            </div>
          )}
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
