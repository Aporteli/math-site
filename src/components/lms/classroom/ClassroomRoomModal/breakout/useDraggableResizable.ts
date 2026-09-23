'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface PanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Options {
  initial: PanelRect;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  storageKey?: string;
  /** კონტეინერი, რომლის შიგნითაც უნდა დარჩეს პანელი */
  boundsRef?: React.RefObject<HTMLElement | null>;
}

type DragMode =
  | { type: 'move'; startX: number; startY: number; startRect: PanelRect }
  | { type: 'resize'; startX: number; startY: number; startRect: PanelRect; edge: Edge }
  | null;

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export function useDraggableResizable({
  initial,
  minWidth = 160,      
  minHeight = 120,    
  maxWidth = 900,
  maxHeight = 900,
  storageKey,
  boundsRef,
}: Options) {
  const [rect, setRect] = useState<PanelRect>(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) return { ...initial, ...JSON.parse(raw) };
      } catch {
        /* ignore */
      }
    }
    return initial;
  });

  const dragRef = useRef<DragMode>(null);
  const rectRef = useRef(rect);
  rectRef.current = rect;

  /* ─── შენახვა localStorage-ში ─── */
  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(rect));
    } catch {
      /* ignore */
    }
  }, [rect, storageKey]);

  /* ─── clamp ფუნქცია ─── */
  const clamp = useCallback(
    (next: PanelRect): PanelRect => {
      const w = Math.max(minWidth, Math.min(maxWidth, next.width));
      const h = Math.max(minHeight, Math.min(maxHeight, next.height));

      let maxX = Infinity;
      let maxY = Infinity;
      const bounds = boundsRef?.current;
      if (bounds) {
        const boundsRect = bounds.getBoundingClientRect();
        maxX = boundsRect.width - w;
        maxY = boundsRect.height - h;
      }

      const x = Math.max(0, Math.min(maxX, next.x));
      const y = Math.max(0, Math.min(maxY, next.y));

      return { x, y, width: w, height: h };
    },
    [boundsRef, maxHeight, maxWidth, minHeight, minWidth],
  );

  /* ─── pointer move/up ─── */
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const s = drag.startRect;

      if (drag.type === 'move') {
        setRect(clamp({ ...s, x: s.x + dx, y: s.y + dy }));
        return;
      }

      // resize
      const edge = drag.edge;
      let { x, y, width, height } = s;

      if (edge.includes('e')) width = s.width + dx;
      if (edge.includes('s')) height = s.height + dy;
      if (edge.includes('w')) {
        width = s.width - dx;
        x = s.x + dx;
      }
      if (edge.includes('n')) {
        height = s.height - dy;
        y = s.y + dy;
      }

      const clamped = clamp({ x, y, width, height });

      // თუ resize-მა ზღვარს მიაღწია — x/y არ "გადახტეს"
      if (edge.includes('w')) {
        clamped.x = Math.min(clamped.x, s.x + s.width - minWidth);
      }
      if (edge.includes('n')) {
        clamped.y = Math.min(clamped.y, s.y + s.height - minHeight);
      }

      setRect(clamped);
    },
    [clamp, minHeight, minWidth],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  /* ─── საჯარო handlers ─── */
  const startDrag = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      type: 'move',
      startX: e.clientX,
      startY: e.clientY,
      startRect: rectRef.current,
    };
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }, []);

  const startResize = useCallback(
    (edge: Edge) => (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        type: 'resize',
        edge,
        startX: e.clientX,
        startY: e.clientY,
        startRect: rectRef.current,
      };
      document.body.style.cursor = cursorFor(edge);
      document.body.style.userSelect = 'none';
    },
    [],
  );

  const reset = useCallback(() => {
    setRect(initial);
  }, [initial]);

  return {
    rect,
    startDrag,
    startResize,
    reset,
  };
}

function cursorFor(edge: Edge): string {
  if (edge === 'n' || edge === 's') return 'ns-resize';
  if (edge === 'e' || edge === 'w') return 'ew-resize';
  if (edge === 'ne' || edge === 'sw') return 'nesw-resize';
  return 'nwse-resize';
}