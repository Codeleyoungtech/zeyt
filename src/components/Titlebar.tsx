import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { useAppStore } from "../lib/store";

export default function Titlebar() {
  const appWindow = getCurrentWindow();
  const [isMac, setIsMac] = useState(false);
  
  const activeWorkspaceId = useAppStore(state => state.activeWorkspaceId);
  const workspaceName = useAppStore(state => {
    const ws = state.workspaces.find(w => w.id === state.activeWorkspaceId);
    return ws?.name;
  });

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  const handleDrag = (e: React.PointerEvent) => {
    if (e.button === 0) {
      e.preventDefault();
      appWindow.startDragging();
    }
  };

  const MacControls = () => (
    <div className="flex gap-2.5 items-center group pl-2">
      <button
        onClick={() => appWindow.close()}
        className="w-3 h-3 rounded-full bg-[#ff5f56] flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity"
      >
        <svg className="w-2 h-2 text-black opacity-0 group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <button
        onClick={() => appWindow.minimize()}
        className="w-3 h-3 rounded-full bg-[#ffbd2e] flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity"
      >
        <svg className="w-2 h-2 text-black opacity-0 group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
      <button
        onClick={() => appWindow.toggleMaximize()}
        className="w-3 h-3 rounded-full bg-[#27c93f] flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity"
      >
        <svg className="w-2 h-2 text-black opacity-0 group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 3 21 3 21 9"></polyline>
          <polyline points="9 21 3 21 3 15"></polyline>
          <line x1="21" y1="3" x2="14" y2="10"></line>
          <line x1="3" y1="21" x2="10" y2="14"></line>
        </svg>
      </button>
    </div>
  );

  const WindowsControls = () => (
    <div className="flex items-center gap-1.5 pr-2">
      <button
        onClick={() => appWindow.minimize()}
        className="w-8 h-8 flex items-center justify-center rounded-md text-[#cccccc] hover:bg-[#333333] hover:text-white transition-colors"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
      <button
        onClick={() => appWindow.toggleMaximize()}
        className="w-8 h-8 flex items-center justify-center rounded-md text-[#cccccc] hover:bg-[#333333] hover:text-white transition-colors"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        </svg>
      </button>
      <button
        onClick={() => appWindow.close()}
        className="w-8 h-8 flex items-center justify-center rounded-md text-[#cccccc] hover:bg-[#e81123] hover:text-white transition-colors"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );

  return (
    <div
      onPointerDown={handleDrag}
      className="h-[38px] flex items-center shrink-0 w-full select-none bg-[#1e1e1e] border-b border-[#333333]"
    >
      {isMac && (
        <div className="pl-2 h-full flex items-center">
          <MacControls />
        </div>
      )}
      
      <div 
        className="flex-1 h-full flex justify-center items-center text-[#999999] text-xs font-medium cursor-default gap-2"
      >
        {activeWorkspaceId && workspaceName ? (
          <>
            <svg className="w-3 h-3 text-[var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>{workspaceName}</span>
          </>
        ) : (
          <span>Zeyt</span>
        )}
      </div>

      {!isMac && <WindowsControls />}
    </div>
  );
}
