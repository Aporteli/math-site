//CUT


'use client';

import { useCallback, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import type { CropRegion } from '../utils/types';

interface Props {
  src: string;
  naturalW: number;
  naturalH: number;
  initialRect: CropRegion;
  containerW: number;
  containerH: number;
  onConfirm: (rect: CropRegion) => void;
  onCancel: () => void;
}

type HandleId =
  | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move';

const PADDING = 56;
const HANDLE_SIZE = 12;
const MIN_SIDE = 16;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function InlineCropOverlay({
  src,
  naturalW,
  naturalH,
  initialRect,
  containerW,
  containerH,
  onConfirm,
  onCancel,
}: Props) {
  const availW = Math.max(100, containerW - PADDING * 2);
  const availH = Math.max(100, containerH - PADDING * 2);
  const scale = Math.min(availW / naturalW, availH / naturalH, 1);
  const dispW = naturalW * scale;
  const dispH = naturalH * scale;
  const offsetX = (containerW - dispW) / 2;
  const offsetY = (containerH - dispH) / 2;

  const [rect, setRect] = useState<CropRegion>(() => ({
    x: initialRect.x * scale,
    y: initialRect.y * scale,
    w: initialRect.w * scale,
    h: initialRect.h * scale,
  }));
  const rectRef = useRef(rect);
  rectRef.current = rect;

  const dragRef = useRef<{
    handle: HandleId;
    startX: number;
    startY: number;
    startRect: CropRegion;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, handle: HandleId) => {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const box = (e.currentTarget as HTMLElement)
        .closest('[data-crop-root]')!
        .getBoundingClientRect();
      const localX = e.clientX - box.left - offsetX;
      const localY = e.clientY - box.top - offsetY;
      dragRef.current = {
        handle,
        startX: localX,
        startY: localY,
        startRect: { ...rectRef.current },
      };
    },
    [offsetX, offsetY],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();

      const box = (e.currentTarget as HTMLElement)
        .closest('[data-crop-root]')!
        .getBoundingClientRect();
      const localX = e.clientX - box.left - offsetX;
      const localY = e.clientY - box.top - offsetY;
      const dx = localX - drag.startX;
      const dy = localY - drag.startY;
      const r = drag.startRect;

      let next: CropRegion = { ...r };

      switch (drag.handle) {
        case 'move':
          next.x = clamp(r.x + dx, 0, dispW - r.w);
          next.y = clamp(r.y + dy, 0, dispH - r.h);
          break;
        case 'n':
          next.y = clamp(r.y + dy, 0, r.y + r.h - MIN_SIDE);
          next.h = r.h - (next.y - r.y);
          break;
        case 's':
          next.h = clamp(r.h + dy, MIN_SIDE, dispH - r.y);
          break;
        case 'w':
          next.x = clamp(r.x + dx, 0, r.x + r.w - MIN_SIDE);
          next.w = r.w - (next.x - r.x);
          break;
        case 'e':
          next.w = clamp(r.w + dx, MIN_SIDE, dispW - r.x);
          break;
        case 'nw':
          next.x = clamp(r.x + dx, 0, r.x + r.w - MIN_SIDE);
          next.y = clamp(r.y + dy, 0, r.y + r.h - MIN_SIDE);
          next.w = r.w - (next.x - r.x);
          next.h = r.h - (next.y - r.y);
          break;
        case 'ne':
          next.y = clamp(r.y + dy, 0, r.y + r.h - MIN_SIDE);
          next.w = clamp(r.w + dx, MIN_SIDE, dispW - r.x);
          next.h = r.h - (next.y - r.y);
          break;
        case 'sw':
          next.x = clamp(r.x + dx, 0, r.x + r.w - MIN_SIDE);
          next.w = r.w - (next.x - r.x);
          next.h = clamp(r.h + dy, MIN_SIDE, dispH - r.y);
          break;
        case 'se':
          next.w = clamp(r.w + dx, MIN_SIDE, dispW - r.x);
          next.h = clamp(r.h + dy, MIN_SIDE, dispH - r.y);
          break;
      }

      setRect(next);
    },
    [offsetX, offsetY, dispW, dispH],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleConfirm = () => {
    onConfirm({
      x: Math.round(rect.x / scale),
      y: Math.round(rect.y / scale),
      w: Math.round(rect.w / scale),
      h: Math.round(rect.h / scale),
    });
  };

  const handle = (
    id: HandleId,
    cursor: string,
    style: React.CSSProperties,
  ) => (
    <div
      key={id}
      onPointerDown={(e) => onPointerDown(e, id)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'absolute',
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        background: 'white',
        border: '2px solid #4f46e5',
        borderRadius: 3,
        cursor,
        touchAction: 'none',
        ...style,
      }}
    />
  );

  return (
    <div
      data-crop-root
      className="pointer-events-auto absolute inset-0 z-40 bg-slate-950/85"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          left: offsetX,
          top: offsetY,
          width: dispW,
          height: dispH,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />

      {/* Dimming + crop rect */}
      <div
        style={{
          position: 'absolute',
          left: offsetX + rect.x,
          top: offsetY + rect.y,
          width: rect.w,
          height: rect.h,
          boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.55)',
          border: '1.5px dashed rgba(255, 255, 255, 0.95)',
          cursor: 'move',
          touchAction: 'none',
        }}
        onPointerDown={(e) => onPointerDown(e, 'move')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {handle('nw', 'nwse-resize', { left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 })}
        {handle('n', 'ns-resize', { left: rect.w / 2 - HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 })}
        {handle('ne', 'nesw-resize', { right: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 })}
        {handle('e', 'ew-resize', { right: -HANDLE_SIZE / 2, top: rect.h / 2 - HANDLE_SIZE / 2 })}
        {handle('se', 'nwse-resize', { right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 })}
        {handle('s', 'ns-resize', { left: rect.w / 2 - HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 })}
        {handle('sw', 'nesw-resize', { left: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 })}
        {handle('w', 'ew-resize', { left: -HANDLE_SIZE / 2, top: rect.h / 2 - HANDLE_SIZE / 2 })}
      </div>

      {/* Action bar */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white/80 transition hover:bg-white/10"
        >
          <X className="size-3.5" />
          გაუქმება
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white transition hover:bg-indigo-700"
        >
          <Check className="size-3.5" />
          დადასტურება
        </button>
      </div>
    </div>
  );
}