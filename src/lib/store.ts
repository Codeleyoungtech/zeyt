import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { Settings, defaultSettings } from './theme';

export type PaneNode =
  | { type: 'leaf'; id: string }
  | { type: 'split'; id: string; direction: 'horizontal' | 'vertical'; ratio: number; first: PaneNode; second: PaneNode };

export interface Tab {
  id: string;
  title: string;
  root: PaneNode;
  activePaneId: string;
}

interface AppState {
  tabs: Tab[];
  activeTabId: string | null;
  settings: Settings;
  isSettingsOpen: boolean;
  
  addTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabTitle: (id: string, title: string) => void;

  // Pane actions
  setActivePane: (paneId: string) => void;
  splitPane: (direction: 'horizontal' | 'vertical') => void;
  closePane: (paneId: string) => void;
  updateSplitRatio: (splitId: string, newRatio: number) => void;

  // Settings
  toggleSettings: () => void;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<Settings>) => void;
}

const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function mapTree(node: PaneNode, fn: (n: PaneNode) => PaneNode): PaneNode {
  const mapped = fn(node);
  // If fn changed the node, don't recurse into the newly created structure
  if (mapped !== node) {
    return mapped;
  }
  
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

export const useAppStore = create<AppState>((set, get) => ({
  tabs: [{ id: 'tab-0', title: 'Terminal', root: { type: 'leaf', id: 'pane-0' }, activePaneId: 'pane-0' }],
  activeTabId: 'tab-0',
  settings: defaultSettings,
  isSettingsOpen: false,

  addTab: () => set((state) => {
    const id = generateId();
    const paneId = generateId();
    const newTab: Tab = { id, title: 'Terminal', root: { type: 'leaf', id: paneId }, activePaneId: paneId };
    return {
      tabs: [...state.tabs, newTab],
      activeTabId: id,
    };
  }),

  // ... rest of actions
  toggleSettings: () => set(state => ({ isSettingsOpen: !state.isSettingsOpen })),

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
      invoke('save_settings', { settingsJson: JSON.stringify(updated) }).catch(e => console.error(e));
      return { settings: updated };
    });
  },

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
    
    return {
      tabs: newTabs,
      activeTabId: newActiveId,
    };
  }),

  setActiveTab: (id: string) => set({ activeTabId: id }),

  updateTabTitle: (id: string, title: string) => set((state) => ({
    tabs: state.tabs.map(t => t.id === id ? { ...t, title } : t)
  })),

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
        
        const newRoot = mapTree(tab.root, (node) => {
          if (node.id === tab.activePaneId) {
            return {
              type: 'split',
              id: splitId,
              direction,
              ratio: 0.5,
              first: node, // The existing leaf keeps its ID and state
              second: { type: 'leaf', id: newPaneId }
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
      // Only one pane left in this tab. Close the tab.
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

  updateSplitRatio: (splitId: string, newRatio: number) => set((state) => {
    if (!state.activeTabId) return state;
    return {
      tabs: state.tabs.map(tab => {
        if (tab.id !== state.activeTabId) return tab;
        const newRoot = mapTree(tab.root, (node) => {
          if (node.id === splitId && node.type === 'split') {
            return { ...node, ratio: newRatio };
          }
          return node;
        });
        return { ...tab, root: newRoot };
      })
    };
  })
}));
