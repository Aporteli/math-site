'use client';

import { useRef, useState } from 'react';
import { useBreakout } from '../BreakoutContext';
import { useDraggableResizable } from '../useDraggableResizable';
import { ActiveRooms } from './ActiveRooms';
import { AssignRooms } from './AssignRooms';
import { AudioBlockedNotice } from './AudioBlockedNotice';
import { DashboardHeader } from './DashboardHeader';
import { ResizeHandles } from './ResizeHandles';
import type { BreakoutDashboardProps } from './types';

export function BreakoutDashboard({ students }: BreakoutDashboardProps) {
  const breakout = useBreakout();
  const containerRef = useRef<HTMLDivElement>(null);

  const { rect, startDrag, startResize, reset } = useDraggableResizable({
    initial: { x: 8, y: 56, width: 440, height: 560 },
    minWidth: 160,
    minHeight: 120,
    maxWidth: 900,
    maxHeight: 900,
    storageKey: 'breakout-dashboard-rect',
    boundsRef: containerRef,
  });

  const [maximized, setMaximized] = useState(false);

  // ⬇️ compact რეჟიმი — ვიწრო პანელზე ტექსტი იმალება
  const isCompact = rect.width < 340;

  if (!breakout.dashboardOpen) return null;

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      <div
        className="pointer-events-auto absolute flex min-w-0 flex-col overflow-hidden rounded-box border border-hairline bg-sectionHeader shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        style={
          maximized
            ? {
                inset: '8px',
                width: 'auto',
                height: 'auto',
              }
            : {
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
              }
        }>
        <DashboardHeader
          active={breakout.breakout.active}
          maximized={maximized}
          onDragStart={maximized ? undefined : startDrag}
          onReset={reset}
          onToggleMaximized={() => setMaximized((v) => !v)}
          onClose={() => breakout.setDashboardOpen(false)}
        />

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3">
          {breakout.audioBlocked && <AudioBlockedNotice onResume={breakout.resumeMonitorAudio} />}

          {breakout.breakout.active ? (
            <ActiveRooms students={students} compact={isCompact} />
          ) : (
            <AssignRooms students={students} />
          )}

          {breakout.actionError && (
            <p className="mt-3 break-words text-xs font-bold leading-5 text-rose-500">{breakout.actionError}</p>
          )}
        </div>

        {!maximized && <ResizeHandles startResize={startResize} />}
      </div>
    </div>
  );
}
