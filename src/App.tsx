import Titlebar from "./components/Titlebar";
import TabBar from "./components/TabBar";
import PaneTree from "./components/PaneTree";
import SettingsPanel from "./components/SettingsModal";
import WorkspaceSidebar from "./components/WorkspaceSwitcher";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore, PaneNode } from "./lib/store";
import { useEffect } from "react";
import { TerminalRegistry } from "./lib/TerminalRegistry";
import { ensureNotificationPermission, setupNotificationFocusListener } from "./lib/notifications";

export default function App() {
  const appWindow = getCurrentWindow();
  const { tabs, workspaces, activeTabId, addTab, loadSettings, loadWorkspaces, toggleWorkspaceSwitcher, toggleSettings, settings } = useAppStore();

  const handleResize = (direction: any) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    appWindow.startResizeDragging(direction);
  };

  // Initialize
  useEffect(() => {
    loadSettings();
    loadWorkspaces();
    ensureNotificationPermission();
    setupNotificationFocusListener();
  }, [loadSettings, loadWorkspaces]);

  // Global Keybindings
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (settings?.workspaceSwitcherMode === 'sidebar') {
          const searchInput = document.getElementById('workspace-sidebar-search');
          if (searchInput) searchInput.focus();
        } else {
          toggleWorkspaceSwitcher();
        }
      } else if (e.key === ',') {
        e.preventDefault();
        toggleSettings();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [toggleWorkspaceSwitcher, toggleSettings, settings?.workspaceSwitcherMode]);

  // Terminal Settings Update
  useEffect(() => {
    TerminalRegistry.updateSettings(settings);
  }, [settings]);

  // Terminal Garbage Collection
  useEffect(() => {
    const activePaneIds = new Set<string>();

    const collect = (node: PaneNode) => {
      if (node.type === 'leaf') activePaneIds.add(node.id);
      else {
        collect(node.first);
        collect(node.second);
      }
    };

    tabs.forEach(tab => collect(tab.root));
    workspaces.forEach(ws => {
      ws.tabs.forEach(tab => collect(tab.root));
    });

    TerminalRegistry.destroyAllExcept(activePaneIds);
  }, [tabs, workspaces]);

  // If no tabs exist, create a new one automatically
  useEffect(() => {
    if (tabs.length === 0) {
      addTab();
    }
  }, [tabs.length, addTab]);

  return (
    <div className="w-screen h-screen bg-transparent relative flex flex-col">
      <SettingsPanel />
      {settings?.workspaceSwitcherMode !== 'sidebar' && <WorkspaceSidebar />}
      {/* Invisible resize handles */}
      <div className="absolute top-0 left-0 w-full h-2 cursor-n-resize z-50" onPointerDown={handleResize('North')} />
      <div className="absolute bottom-0 left-0 w-full h-2 cursor-s-resize z-50" onPointerDown={handleResize('South')} />
      <div className="absolute top-0 left-0 w-2 h-full cursor-w-resize z-50" onPointerDown={handleResize('West')} />
      <div className="absolute top-0 right-0 w-2 h-full cursor-e-resize z-50" onPointerDown={handleResize('East')} />
      <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize z-50" onPointerDown={handleResize('NorthWest')} />
      <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize z-50" onPointerDown={handleResize('NorthEast')} />
      <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize z-50" onPointerDown={handleResize('SouthWest')} />
      <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize z-50" onPointerDown={handleResize('SouthEast')} />

      {/* Main App Container */}
      <div className="flex-1 w-full flex flex-row min-h-0 border border-[#333333] rounded-lg overflow-hidden">
        {settings?.workspaceSwitcherMode === 'sidebar' && <WorkspaceSidebar />}
        <div className="flex-1 h-full flex flex-col bg-[#1a1a1e] min-w-0">
          <Titlebar />
          <TabBar />
          <div className="flex-1 w-full min-h-0 relative">
            {tabs.map(tab => (
              <div 
                key={tab.id}
                className={
                  tab.id === activeTabId 
                    ? "absolute inset-0 z-10" 
                    : "absolute inset-0 z-0 opacity-0 pointer-events-none"
                }
              >
                <PaneTree node={tab.root} tabId={tab.id} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
