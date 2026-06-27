import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { Settings, defaultSettings } from './theme';

export type PaneNode =
  | { type: 'leaf'; id: string; cwd?: string }
  | { type: 'split'; id: string; direction: 'horizontal' | 'vertical'; ratio: number; first: PaneNode; second: PaneNode };

export interface Tab {
  id: string;
  title: string;
  root: PaneNode;
  activePaneId: string;
}

export interface Workspace {
  id: string;
  name: string;
  rootPath: string;
  tabs: Tab[];
  activeTabId: string;
  lastUsedAt: number;
  favorite?: boolean;
}

interface AppState {
  tabs: Tab[];
  activeTabId: string | null;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  settings: Settings;
  isSettingsOpen: boolean;
  isWorkspaceSwitcherOpen: boolean;
  badgedTabIds: Set<string>;
  
  addTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabTitle: (id: string, title: string) => void;

  // Pane actions
  setActivePane: (paneId: string) => void;
  splitPane: (direction: 'horizontal' | 'vertical') => void;
  closePane: (paneId: string) => void;
  updateSplitRatio: (splitId: string, newRatio: number) => void;
  updatePaneCwd: (paneId: string, cwd: string) => void;

  // Settings
  toggleSettings: () => void;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<Settings>) => void;

  // Workspaces
  toggleWorkspaceSwitcher: () => void;
  loadWorkspaces: () => Promise<void>;
  createWorkspace: (rootPath: string) => void;
  switchWorkspace: (workspaceId: string) => void;
  deleteWorkspace: (workspaceId: string) => void;
  renameWorkspace: (workspaceId: string, newName: string) => void;
  toggleWorkspaceFavorite: (workspaceId: string) => void;
  reorderWorkspaces: (sourceId: string, targetId: string) => void;

  // Badges
  addTabBadge: (tabId: string) => void;
  clearTabBadge: (tabId: string) => void;
}

const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function mapTree(node: PaneNode, fn: (n: PaneNode) => PaneNode): PaneNode {
  const mapped = fn(node);
  if (mapped !== node) return mapped;
  if (node.type === 'split') {
    return {
      ...node,
      first: mapTree(node.first, fn),
      second: mapTree(node.second, fn)
    };
  }
  return node;
}

function findParentSplit(root: PaneNode, childId: string): PaneNode | null {
  if (root.type === 'leaf') return null;
  if (root.first.id === childId || root.second.id === childId) return root;
  return findParentSplit(root.first, childId) || findParentSplit(root.second, childId);
}

function getFirstLeaf(node: PaneNode): string {
  if (node.type === 'leaf') return node.id;
  return getFirstLeaf(node.first);
}

function countLeaves(node: PaneNode): number {
  if (node.type === 'leaf') return 1;
  return countLeaves(node.first) + countLeaves(node.second);
}

// Helpers: sync current tabs into the active workspace's slot
function syncWorkspaces(state: AppState): Workspace[] {
  if (!state.activeWorkspaceId) return state.workspaces;
  return state.workspaces.map(w => w.id === state.activeWorkspaceId ? {
    ...w,
    tabs: state.tabs,
    activeTabId: state.activeTabId || '',
    lastUsedAt: Date.now()
  } : w);
}

export { countLeaves };

export const useAppStore = create<AppState>((set, get) => ({
  tabs: [{ id: 'tab-0', title: 'Terminal', root: { type: 'leaf', id: 'pane-0' }, activePaneId: 'pane-0' }],
  activeTabId: 'tab-0',
  workspaces: [],
  activeWorkspaceId: null,
  settings: defaultSettings,
  isSettingsOpen: false,
  isWorkspaceSwitcherOpen: false,
  badgedTabIds: new Set<string>(),

  // ── Tab actions ──────────────────────────────────────────
  addTab: () => set((state) => {
    const id = generateId();
    const paneId = generateId();
    
    let cwd: string | undefined;
    if (state.activeTabId) {
      const activeTab = state.tabs.find(t => t.id === state.activeTabId);
      if (activeTab) {
        const findCwd = (n: PaneNode): string | undefined => {
          if (n.type === 'leaf' && n.id === activeTab.activePaneId) return n.cwd;
          if (n.type === 'split') return findCwd(n.first) || findCwd(n.second);
          return undefined;
        };
        cwd = findCwd(activeTab.root);
      }
    }

    const newTab: Tab = { id, title: 'Terminal', root: { type: 'leaf', id: paneId, cwd }, activePaneId: paneId };
    return { tabs: [...state.tabs, newTab], activeTabId: id };
  }),

  closeTab: (id: string) => set((state) => {
    const newTabs = state.tabs.filter(t => t.id !== id);
    let newActiveId = state.activeTabId;
    if (state.activeTabId === id && newTabs.length > 0) {
      const closedIndex = state.tabs.findIndex(t => t.id === id);
      const nextIndex = Math.min(closedIndex, newTabs.length - 1);
      newActiveId = newTabs[nextIndex].id;
    } else if (newTabs.length === 0) {
      newActiveId = null;
    }
    return { tabs: newTabs, activeTabId: newActiveId };
  }),

  setActiveTab: (id: string) => set((state) => {
    // Clear badge when switching to a tab
    const newBadges = new Set(state.badgedTabIds);
    newBadges.delete(id);
    return { activeTabId: id, badgedTabIds: newBadges };
  }),

  updateTabTitle: (id: string, title: string) => set((state) => ({
    tabs: state.tabs.map(t => t.id === id ? { ...t, title } : t)
  })),

  // ── Pane actions ─────────────────────────────────────────
  setActivePane: (paneId: string) => set((state) => {
    if (!state.activeTabId) return state;
    return {
      tabs: state.tabs.map(tab => tab.id === state.activeTabId ? { ...tab, activePaneId: paneId } : tab)
    };
  }),

  splitPane: (direction) => set((state) => {
    if (!state.activeTabId) return state;
    return {
      tabs: state.tabs.map(tab => {
        if (tab.id !== state.activeTabId) return tab;
        const newPaneId = generateId();
        const splitId = generateId();
        let foundCwd: string | undefined;

        const newRoot = mapTree(tab.root, (node) => {
          if (node.id === tab.activePaneId) {
            foundCwd = node.type === 'leaf' ? node.cwd : undefined;
            return {
              type: 'split',
              id: splitId,
              direction,
              ratio: 0.5,
              first: node,
              second: { type: 'leaf', id: newPaneId, cwd: foundCwd }
            };
          }
          return node;
        });

        return { ...tab, root: newRoot, activePaneId: newPaneId };
      })
    };
  }),

  closePane: (paneId: string) => set((state) => {
    if (!state.activeTabId) return state;
    const tab = state.tabs.find(t => t.id === state.activeTabId);
    if (!tab) return state;

    if (tab.root.id === paneId) {
      // Only one pane left — close the tab
      get().closeTab(tab.id);
      return {};
    }

    const parent = findParentSplit(tab.root, paneId);
    if (!parent || parent.type !== 'split') return state;

    const sibling = parent.first.id === paneId ? parent.second : parent.first;
    const newRoot = mapTree(tab.root, (node) => {
      if (node.id === parent.id) return sibling;
      return node;
    });

    let newActivePaneId = tab.activePaneId;
    if (tab.activePaneId === paneId) {
      newActivePaneId = getFirstLeaf(sibling);
    }

    return {
      tabs: state.tabs.map(t => t.id === tab.id ? { ...t, root: newRoot, activePaneId: newActivePaneId } : t)
    };
  }),

  updateSplitRatio: (splitId, newRatio) => set((state) => ({
    tabs: state.tabs.map(tab => {
      const newRoot = mapTree(tab.root, (node) => {
        if (node.type === 'split' && node.id === splitId) return { ...node, ratio: newRatio };
        return node;
      });
      return { ...tab, root: newRoot };
    })
  })),

  updatePaneCwd: (paneId, cwd) => set((state) => ({
    tabs: state.tabs.map(tab => {
      const newRoot = mapTree(tab.root, (node) => {
        if (node.type === 'leaf' && node.id === paneId) return { ...node, cwd };
        return node;
      });
      return { ...tab, root: newRoot };
    })
  })),

  // ── Settings ─────────────────────────────────────────────
  toggleSettings: () => set(state => ({ isSettingsOpen: !state.isSettingsOpen })),
  toggleWorkspaceSwitcher: () => set(state => ({ isWorkspaceSwitcherOpen: !state.isWorkspaceSwitcherOpen })),

  loadSettings: async () => {
    try {
      const json = await invoke<string>('load_settings');
      if (json && json !== '{}') {
        const saved = JSON.parse(json);
        set(state => ({ settings: { ...state.settings, ...saved } }));
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  },

  updateSettings: (newSettings) => {
    set(state => {
      const updated = { ...state.settings, ...newSettings };
      invoke('save_settings', { settingsJson: JSON.stringify(updated) }).catch(console.error);
      return { settings: updated };
    });
  },

  // ── Workspaces ───────────────────────────────────────────
  loadWorkspaces: async () => {
    try {
      const json = await invoke<string>('load_workspaces');
      let workspaces: Workspace[] = [];
      if (json && json !== '[]') {
        workspaces = JSON.parse(json);
        set({ workspaces });
      }

      // Check for CLI args (args[0] is binary, args[1] is potential path)
      let cliPath: string | null = null;
      try {
        const args = await invoke<string[]>('get_cli_args');
        if (args.length > 1) {
          // Tauri passes -- as a separator sometimes, or just the path directly
          const potentialPath = args[args.length - 1]; // Naive check: take the last arg as path if it isn't a flag
          if (!potentialPath.startsWith('-')) {
            cliPath = potentialPath;
          }
        }
      } catch (e) {
        console.error("Failed to get CLI args:", e);
      }

      const state = get();
      if (!state.activeWorkspaceId) {
        if (cliPath) {
          // Check if workspace already exists
          const existing = workspaces.find(w => w.rootPath === cliPath);
          if (existing) {
            set({
              activeWorkspaceId: existing.id,
              tabs: existing.tabs,
              activeTabId: existing.activeTabId,
            });
          } else {
            // Create a new workspace for the CLI path
            const folderName = cliPath.split('/').filter(Boolean).pop() || 'Workspace';
            const paneId = generateId();
            const tabId = generateId();
            
            const freshTab: Tab = {
              id: tabId,
              title: 'Terminal',
              root: { type: 'leaf', id: paneId, cwd: cliPath },
              activePaneId: paneId
            };
            
            const newWorkspace: Workspace = {
              id: generateId(),
              name: folderName,
              rootPath: cliPath,
              tabs: [freshTab],
              activeTabId: tabId,
              favorite: false,
              lastUsedAt: Date.now()
            };
            
            set({
              workspaces: [...workspaces, newWorkspace],
              activeWorkspaceId: newWorkspace.id,
              tabs: newWorkspace.tabs,
              activeTabId: newWorkspace.activeTabId,
            });
          }
        } else if (workspaces.length > 0) {
          const lastActive = [...workspaces].sort((a, b) => b.lastUsedAt - a.lastUsedAt)[0];
          // Apply the workspace's saved layout
          set({
            activeWorkspaceId: lastActive.id,
            tabs: lastActive.tabs,
            activeTabId: lastActive.activeTabId,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load workspaces:", err);
    }
  },

  createWorkspace: (rootPath: string) => set((state) => {
    const synced = syncWorkspaces(state);
    const folderName = rootPath.split('/').filter(Boolean).pop() || 'Workspace';
    const paneId = generateId();
    const tabId = generateId();

    const freshTab: Tab = {
      id: tabId,
      title: 'Terminal',
      root: { type: 'leaf', id: paneId, cwd: rootPath },
      activePaneId: paneId
    };

    const newWorkspace: Workspace = {
      id: generateId(),
      name: folderName,
      rootPath,
      tabs: [freshTab],
      activeTabId: tabId,
      lastUsedAt: Date.now(),
    };

    const newWorkspaces = [...synced, newWorkspace];
    scheduleWorkspaceSave(newWorkspaces);

    return {
      workspaces: newWorkspaces,
      activeWorkspaceId: newWorkspace.id,
      tabs: newWorkspace.tabs,
      activeTabId: newWorkspace.activeTabId,
    };
  }),

  switchWorkspace: (workspaceId: string) => set((state) => {
    const synced = syncWorkspaces(state);
    const target = synced.find(w => w.id === workspaceId);
    if (!target) return state;

    scheduleWorkspaceSave(synced);

    return {
      workspaces: synced,
      activeWorkspaceId: target.id,
      tabs: target.tabs,
      activeTabId: target.activeTabId,
    };
  }),

  deleteWorkspace: (workspaceId: string) => set((state) => {
    const newWorkspaces = state.workspaces.filter(w => w.id !== workspaceId);
    const isActive = state.activeWorkspaceId === workspaceId;

    scheduleWorkspaceSave(newWorkspaces);

    if (isActive) {
      // Switch to the most recent remaining workspace, or start fresh
      if (newWorkspaces.length > 0) {
        const next = [...newWorkspaces].sort((a, b) => b.lastUsedAt - a.lastUsedAt)[0];
        return {
          workspaces: newWorkspaces,
          activeWorkspaceId: next.id,
          tabs: next.tabs,
          activeTabId: next.activeTabId,
        };
      } else {
        const paneId = generateId();
        const tabId = generateId();
        return {
          workspaces: newWorkspaces,
          activeWorkspaceId: null,
          tabs: [{ id: tabId, title: 'Terminal', root: { type: 'leaf', id: paneId }, activePaneId: paneId }],
          activeTabId: tabId,
        };
      }
    }

    return { workspaces: newWorkspaces };
  }),

  renameWorkspace: (workspaceId: string, newName: string) => set((state) => {
    const newWorkspaces = state.workspaces.map(w =>
      w.id === workspaceId ? { ...w, name: newName } : w
    );
    scheduleWorkspaceSave(newWorkspaces);
    return { workspaces: newWorkspaces };
  }),

  toggleWorkspaceFavorite: (workspaceId: string) => set((state) => {
    const newWorkspaces = state.workspaces.map(w =>
      w.id === workspaceId ? { ...w, favorite: !w.favorite } : w
    );
    scheduleWorkspaceSave(newWorkspaces);
    return { workspaces: newWorkspaces };
  }),

  reorderWorkspaces: (sourceId: string, targetId: string) => set((state) => {
    if (sourceId === targetId) return state;
    
    // We maintain an ordered array.
    const newWorkspaces = [...state.workspaces];
    const sourceIndex = newWorkspaces.findIndex(w => w.id === sourceId);
    const targetIndex = newWorkspaces.findIndex(w => w.id === targetId);
    
    if (sourceIndex === -1 || targetIndex === -1) return state;
    
    const [moved] = newWorkspaces.splice(sourceIndex, 1);
    newWorkspaces.splice(targetIndex, 0, moved);
    
    scheduleWorkspaceSave(newWorkspaces);
    return { workspaces: newWorkspaces };
  }),

  // ── Badges ──────────────────────────────────────────────
  addTabBadge: (tabId: string) => set((state) => {
    // Don't badge the currently active tab
    if (state.activeTabId === tabId) return state;
    const newBadges = new Set(state.badgedTabIds);
    newBadges.add(tabId);
    return { badgedTabIds: newBadges };
  }),

  clearTabBadge: (tabId: string) => set((state) => {
    const newBadges = new Set(state.badgedTabIds);
    newBadges.delete(tabId);
    return { badgedTabIds: newBadges };
  }),
}));

// ── Debounced disk save (replaces the buggy subscribe loop) ──
let saveTimeout: ReturnType<typeof setTimeout>;
function scheduleWorkspaceSave(workspaces: Workspace[]) {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    invoke('save_workspaces', { workspacesJson: JSON.stringify(workspaces) }).catch(console.error);
  }, 1000);
}

// Auto-save on tab changes (only syncs into workspace, no cascading)
let tabSaveTimeout: ReturnType<typeof setTimeout>;
useAppStore.subscribe((state, prevState) => {
  if (!state.activeWorkspaceId) return;
  if (state.tabs === prevState.tabs && state.activeTabId === prevState.activeTabId) return;
  // Don't trigger on workspace switch (tabs reference changes completely)
  if (state.activeWorkspaceId !== prevState.activeWorkspaceId) return;

  clearTimeout(tabSaveTimeout);
  tabSaveTimeout = setTimeout(() => {
    const current = useAppStore.getState();
    if (!current.activeWorkspaceId) return;
    const updated = current.workspaces.map(w => w.id === current.activeWorkspaceId ? {
      ...w,
      tabs: current.tabs,
      activeTabId: current.activeTabId || '',
      lastUsedAt: Date.now()
    } : w);
    useAppStore.setState({ workspaces: updated });
    invoke('save_workspaces', { workspacesJson: JSON.stringify(updated) }).catch(console.error);
  }, 2000);
});
