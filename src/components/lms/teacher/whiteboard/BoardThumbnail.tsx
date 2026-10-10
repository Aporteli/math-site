'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { CanvasElement } from '@/components/lms/classroom/KonvaCanvas/utils/types';

export function BoardThumbnail({
  elements,
  isActive,
  pageIndex,
  isDark,
  onClick,
  onDelete,
  canDelete,
}: {
  elements: CanvasElement[];
  isActive: boolean;
  pageIndex: number;
  isDark: boolean;
  onClick: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = isDark ? '#020617' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);
    if (!elements || elements.length === 0) return;

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
      ctx.strokeStyle = isDark && el.stroke === '#16233a' ? '#ffffff' : el.stroke || '#6366f1';
      ctx.lineWidth = Math.max(2, (el.strokeWidth || 2) * 1.5);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (el.points && el.points.length >= 2) {
        ctx.beginPath();
        const ox = el.x || 0;
        const oy = el.y || 0;
        ctx.moveTo(ox + el.points[0], oy + el.points[1]);
        for (let i = 2; i < el.points.length; i += 2) ctx.lineTo(ox + el.points[i], oy + el.points[i + 1]);
        if (el.type === 'triangle' || el.type === 'diamond') ctx.closePath();
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
      onClick={onClick}
      className={`group relative flex shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-box p-1.5 transition-all ${isActive ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]' : 'border border-hairline hover:bg-sectionHeader'}`}>
      <div className="relative w-28 h-18 rounded-box overflow-hidden shadow-2xs border border-hairline bg-white">
        <canvas ref={canvasRef} width={112} height={72} className="w-full h-full object-contain" />
        {canDelete && (
          <button
            type="button"
            title="გვერდის წაშლა"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute top-1 right-1 z-10 flex size-5 cursor-pointer items-center justify-center rounded-box border border-rose-500/30 bg-rose-500/15 text-rose-500 opacity-100 shadow-xs transition-opacity hover:bg-rose-500/25 sm:opacity-0 sm:group-hover:opacity-100">
            <X className="size-3" />
          </button>
        )}
      </div>
      <span className={`text-[11px] font-bold ${isActive ? 'text-navy font-extrabold' : 'text-muted'}`}>
        დაფა {pageIndex + 1}
      </span>
    </div>
  );
}
