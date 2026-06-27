import React, { useRef, useState } from 'react';
import TerminalView from './TerminalView';
import { PaneNode, useAppStore, countLeaves } from '../lib/store';
import { TerminalRegistry } from '../lib/TerminalRegistry';

interface PaneTreeProps {
  node: PaneNode;
  tabId: string;
}

function getCwds(node: PaneNode): string[] {
  if (node.type === 'leaf') return [node.cwd || ''];
  return [...getCwds(node.first), ...getCwds(node.second)];
}

function WatchToggle({ paneId, className = "" }: { paneId: string, className?: string }) {
  const [isWatched, setIsWatched] = useState(() => TerminalRegistry.isWatched(paneId));

  const toggleWatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !isWatched;
    TerminalRegistry.setWatched(paneId, newVal);
    setIsWatched(newVal);
  };

  return (
    <button
      onClick={toggleWatch}
      className={`w-5 h-5 flex items-center justify-center rounded transition-all ${
        isWatched
          ? 'text-[var(--brand)] opacity-100'
          : 'text-[#888] hover:text-[var(--brand)]'
      } ${className}`}
      title={isWatched ? 'Stop watching this pane' : 'Watch this pane for notifications'}
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={isWatched ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  );
}

function PaneLeaf({ node, tabId, showHeader }: { node: Extract<PaneNode, { type: 'leaf' }>; tabId: string; showHeader: boolean }) {
  const activeTabId = useAppStore(state => state.activeTabId);
  const activePaneId = useAppStore(state => {
    const tab = state.tabs.find(t => t.id === tabId);
    return tab?.activePaneId;
  });
  const closePane = useAppStore(state => state.closePane);

  const isActive = activeTabId === tabId && activePaneId === node.id;

  return (
    <div 
      className={`group relative w-full h-full flex flex-col overflow-hidden transition-colors border-2 ${
        isActive ? 'border-[var(--brand)]' : 'border-[#222]'
      }`}
    >
      {showHeader ? (
        <PaneHeader paneId={node.id} tabId={tabId} cwd={node.cwd} onClose={() => closePane(node.id)} />
      ) : (
        <div className="absolute top-1 right-1 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <WatchToggle paneId={node.id} className="bg-[#222]/80 hover:bg-[#444]" />
          <button
            onClick={(e) => { e.stopPropagation(); closePane(node.id); }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#444] bg-[#222]/80 transition-opacity"
            title="Close Pane"
          >
            <svg className="w-3 h-3 text-[#ccc]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
      <div className="flex-1 min-h-0 bg-[#1a1a1e]">
        <TerminalView tabId={tabId} paneId={node.id} initialCwd={node.cwd} />
      </div>
    </div>
  );
}

export default function PaneTree({ node, tabId }: PaneTreeProps) {
  const updateSplitRatio = useAppStore(state => state.updateSplitRatio);
  const splitRef = useRef<HTMLDivElement>(null);

  const tabRoot = useAppStore(state => {
    const tab = state.tabs.find(t => t.id === tabId);
    return tab?.root;
  });

  const totalPanes = tabRoot ? countLeaves(tabRoot) : 1;
  const cwds = tabRoot ? getCwds(tabRoot) : [];
  const allSameCwd = new Set(cwds).size <= 1;
  const showPaneHeaders = totalPanes > 1 && !allSameCwd;

  if (node.type === 'leaf') {
    return <PaneLeaf node={node} tabId={tabId} showHeader={showPaneHeaders} />;
  }

  const { direction, ratio, first, second, id } = node;
  const isVertical = direction === 'vertical';

  const handleDragStart = (e: React.PointerEvent) => {
    e.preventDefault();
    const container = splitRef.current;
    if (!container) return;

    const { left, top, width, height } = container.getBoundingClientRect();

    const onPointerMove = (moveEvent: PointerEvent) => {
      let newRatio = ratio;
      if (isVertical) {
        newRatio = (moveEvent.clientX - left) / width;
      } else {
        newRatio = (moveEvent.clientY - top) / height;
      }
      newRatio = Math.max(0.1, Math.min(newRatio, 0.9));
      updateSplitRatio(id, newRatio);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div 
      ref={splitRef}
      className="w-full h-full flex overflow-hidden"
      style={{ flexDirection: isVertical ? 'row' : 'column' }}
    >
      <div 
        style={{ 
          [isVertical ? 'width' : 'height']: `${ratio * 100}%`,
          [isVertical ? 'height' : 'width']: '100%'
        }}
        className="relative"
      >
        <PaneTree node={first} tabId={tabId} />
      </div>

      <div 
        onPointerDown={handleDragStart}
        className={`bg-black z-10 hover:bg-[var(--brand)] transition-colors shrink-0 ${
          isVertical 
            ? 'w-1 cursor-col-resize h-full border-x border-[#333333]' 
            : 'h-1 cursor-row-resize w-full border-y border-[#333333]'
        }`}
      />

      <div className="flex-1 relative">
        <PaneTree node={second} tabId={tabId} />
      </div>
    </div>
  );
}

// ── Pane Header (shown only when splits exist) ──────────────
function PaneHeader({ paneId, tabId, cwd, onClose }: { paneId: string; tabId: string; cwd?: string; onClose: () => void }) {
  const activePaneId = useAppStore(state => {
    const tab = state.tabs.find(t => t.id === tabId);
    return tab?.activePaneId;
  });
  const activeTabId = useAppStore(state => state.activeTabId);
  const isActive = activeTabId === tabId && activePaneId === paneId;

  // Show abbreviated path
  const displayPath = cwd
    ? cwd.replace(/^\/home\/[^/]+/, '~').split('/').slice(-2).join('/')
    : 'terminal';

  return (
    <div className={`h-6 flex items-center justify-between px-2 shrink-0 select-none text-[10px] transition-colors ${
      isActive ? 'bg-[#2a2a2a] text-[#ccc]' : 'bg-[#1a1a1a] text-[#666]'
    }`}>
      <div className="flex items-center gap-1.5 truncate">
        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
        </svg>
        <span className="truncate">{displayPath}</span>
      </div>
      <div className="flex items-center gap-0.5">
        <WatchToggle paneId={paneId} className="w-4 h-4" />
        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-4 h-4 flex items-center justify-center rounded hover:bg-[#444] transition-opacity opacity-0 group-hover:opacity-100"
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
