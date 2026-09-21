import type { CanvasElement } from '../../KonvaCanvas/utils/types';
import { adaptStrokeForTheme } from './theme';

export function renderElementsToDataUrl(elements: CanvasElement[], isDark: boolean): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = isDark ? '#020617' : '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (elements.length === 0) {
    return canvas.toDataURL('image/png');
  }

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
      const ew = el.width || (el.radius ? el.radius * 2 : 150);
      const eh = el.height || (el.radius ? el.radius * 2 : 60);
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

  const padding = 40;
  const boundW = Math.max(100, maxX - minX + padding * 2);
  const boundH = Math.max(100, maxY - minY + padding * 2);
  const scale = Math.min((canvas.width - padding * 2) / boundW, (canvas.height - padding * 2) / boundH, 1.5);
  const offsetX = (canvas.width - boundW * scale) / 2 - (minX - padding) * scale;
  const offsetY = (canvas.height - boundH * scale) / 2 - (minY - padding) * scale;

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
      ctx.strokeRect(el.x || 0, el.y || 0, el.width || 100, el.height || 60);
    } else if (el.type === 'circle') {
      ctx.beginPath();
      ctx.arc(el.x || 0, el.y || 0, el.radius || 30, 0, Math.PI * 2);
      ctx.stroke();
    } else if (el.type === 'text') {
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(el.text || '', el.x || 0, (el.y || 0) + 32);
    }
  });

  ctx.restore();
  return canvas.toDataURL('image/png');
}
