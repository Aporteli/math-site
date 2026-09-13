//CUT დასაჭერელია

'use client';

import { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import type { CanvasElement } from '../../KonvaCanvas/utils/types';
import { adaptStrokeForTheme } from '../utils/theme';

export function BoardThumbnail({
  elements,
  isActive,
  isSelected,
  pageIndex,
  isDark,
  onClick,
  onLongPress,
  onDelete,
  canDelete,
}: {
  elements: CanvasElement[];
  isActive: boolean;
  isSelected?: boolean;
  pageIndex: number;
  isDark: boolean;
  onClick: () => void;
  onLongPress?: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressedRef = useRef(false);

  const startPress = () => {
    isLongPressedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      isLongPressedRef.current = true;
      onLongPress?.();
    }, 700);
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLongPressedRef.current) {
      isLongPressedRef.current = false;
      return;
    }
    onClick();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = isDark ? '#020617' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    if (elements.length === 0) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    elements.forEach((el) => {
      if (el.points && el.points.length > 0) {
        for (let i = 0; i < el.points.length; i += 2) {
          const px = (el.x || 0) + el.points[i];
          const py = (el.y || 0) + el.points[i + 1];
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      } else if (el.x !== undefined && el.y !== undefined) {
        const ew = el.width || (el.radius ? el.radius * 2 : 80);
        const eh = el.height || (el.radius ? el.radius * 2 : 40);
        if (el.x < minX) minX = el.x;
        if (el.x + ew > maxX) maxX = el.x + ew;
        if (el.y < minY) minY = el.y;
        if (el.y + eh > maxY) maxY = el.y + eh;
      }
    });

    if (minX === Infinity) {
      minX = 0;
      minY = 0;
      maxX = 800;
      maxY = 600;
    }

    const boundW = Math.max(100, maxX - minX);
    const boundH = Math.max(100, maxY - minY);
    const scale = Math.min((w - 16) / boundW, (h - 16) / boundH);
    const offsetX = (w - boundW * scale) / 2 - minX * scale;
    const offsetY = (h - boundH * scale) / 2 - minY * scale;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    elements.forEach((el) => {
      let stroke = adaptStrokeForTheme(el.stroke, isDark);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(2, (el.strokeWidth || 2) * 1.5);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.points && el.points.length >= 2) {
        ctx.beginPath();
        const ox = el.x || 0;
        const oy = el.y || 0;
        ctx.moveTo(ox + el.points[0], oy + el.points[1]);
        for (let i = 2; i < el.points.length; i += 2) {
          ctx.lineTo(ox + el.points[i], oy + el.points[i + 1]);
        }
        if (el.type === 'triangle' || el.type === 'diamond') {
          ctx.closePath();
        }
        ctx.stroke();
      } else if (el.type === 'rect') {
        ctx.strokeRect(el.x || 0, el.y || 0, el.width || 40, el.height || 40);
      } else if (el.type === 'circle') {
        ctx.beginPath();
        ctx.arc(el.x || 0, el.y || 0, el.radius || 20, 0, Math.PI * 2);
        ctx.stroke();
      } else if (el.type === 'text') {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(el.text || '', el.x || 0, (el.y || 0) + 20);
      }
    });

    ctx.restore();
  }, [elements, isDark]);

  return (
    <div
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
      onClick={handleClick}
      className={`group relative flex flex-col items-center gap-1.5 p-1.5 rounded-2xl cursor-pointer transition-all shrink-0 select-none [-webkit-touch-callout:none] ${
        isSelected
          ? 'bg-indigo-600/20 ring-2 ring-indigo-600 dark:ring-indigo-400 shadow-md'
          : isActive
            ? 'bg-indigo-600/10 dark:bg-indigo-500/20 ring-2 ring-indigo-600 dark:ring-indigo-400'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800'
      }`}>
      <div className="relative w-28 h-18 rounded-xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 pointer-events-none">
        <canvas ref={canvasRef} width={112} height={72} className="w-full h-full object-contain" />

        {isSelected && (
          <div className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs z-10 animate-in zoom-in-75 duration-150">
            <Check className="size-3 stroke-[3]" />
          </div>
        )}

        {canDelete && (
          <button
            type="button"
            title="გვერდის წაშლა"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="pointer-events-auto absolute top-1 right-1 flex size-5 items-center justify-center rounded-md bg-rose-600 text-white opacity-100 transition-opacity hover:bg-rose-700 shadow-xs z-10">
            <X className="size-3" />
          </button>
        )}
      </div>

      <span
        className={`text-[11px] font-bold ${
          isActive || isSelected
            ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
            : 'text-slate-600 dark:text-slate-400'
        }`}>
        დაფა {pageIndex + 1}
      </span>
    </div>
  );
}
