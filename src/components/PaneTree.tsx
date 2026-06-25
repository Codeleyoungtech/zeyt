import React, { useRef, useEffect } from 'react';
import TerminalView from './TerminalView';
import { PaneNode, useAppStore } from '../lib/store';

interface PaneTreeProps {
  node: PaneNode;
  tabId: string;
}

export default function PaneTree({ node, tabId }: PaneTreeProps) {
  const updateSplitRatio = useAppStore(state => state.updateSplitRatio);
  const splitRef = useRef<HTMLDivElement>(null);

  if (node.type === 'leaf') {
    return <TerminalView tabId={tabId} paneId={node.id} />;
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
        const offset = moveEvent.clientX - left;
        newRatio = offset / width;
      } else {
        const offset = moveEvent.clientY - top;
        newRatio = offset / height;
      }
      
      // Constrain ratio so panes don't disappear
      newRatio = Math.max(0.05, Math.min(newRatio, 0.95));
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
        className={`bg-black z-10 hover:bg-[#ffbd2e] transition-colors shrink-0 ${
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
