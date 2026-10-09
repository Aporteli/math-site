import type { CanvasElement } from './types';

type Box = { minX: number; minY: number; maxX: number; maxY: number };

const snapBoxes = new WeakMap<
  CanvasElement,
  { box: Box; points: number[]; x: number; y: number; rotation: number; scaleX: number; scaleY: number }
>();

function snapBox(el: CanvasElement): Box | null {
  const pts = el.points;
  if (!pts || pts.length < 2) return null;
  const x = el.x || 0;
  const y = el.y || 0;
  const rotation = el.rotation || 0;
  const scaleX = el.scaleX || 1;
  const scaleY = el.scaleY || 1;
  const cached = snapBoxes.get(el);
  if (
    cached &&
    cached.points === pts &&
    cached.x === x &&
    cached.y === y &&
    cached.rotation === rotation &&
    cached.scaleX === scaleX &&
    cached.scaleY === scaleY
  ) {
    return cached.box;
  }

  const cos = Math.cos((rotation * Math.PI) / 180);
  const sin = Math.sin((rotation * Math.PI) / 180);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    const px = pts[i] * scaleX;
    const py = pts[i + 1] * scaleY;
    const absX = x + px * cos - py * sin;
    const absY = y + px * sin + py * cos;
    if (absX < minX) minX = absX;
    if (absY < minY) minY = absY;
    if (absX > maxX) maxX = absX;
    if (absY > maxY) maxY = absY;
  }
  const box = { minX, minY, maxX, maxY };
  snapBoxes.set(el, { box, points: pts, x, y, rotation, scaleX, scaleY });
  return box;
}

/**
 * Pure: returns the snapped point for the given tool. When the tool is not one
 * that snaps, or no element endpoint is within range, returns `pos` unchanged.
 */
export function findSnapPoint(
  pos: { x: number; y: number },
  elements: CanvasElement[],
  activeTool: string,
): { x: number; y: number } {
  let snapX = pos.x;
  let snapY = pos.y;

  if (activeTool !== 'line' && activeTool !== 'arrow' && activeTool !== 'triangle' && activeTool !== 'diamond') {
    return { x: snapX, y: snapY };
  }

  const SNAP_DIST = 18;
  for (const el of elements) {
    if (el.points) {
      const box = snapBox(el);
      if (
        box &&
        (pos.x < box.minX - SNAP_DIST ||
          pos.x > box.maxX + SNAP_DIST ||
          pos.y < box.minY - SNAP_DIST ||
          pos.y > box.maxY + SNAP_DIST)
      ) {
        continue;
      }
      const cos = Math.cos(((el.rotation || 0) * Math.PI) / 180);
      const sin = Math.sin(((el.rotation || 0) * Math.PI) / 180);
      const ex = el.x || 0;
      const ey = el.y || 0;
      for (let i = 0; i < el.points.length; i += 2) {
        const px = el.points[i] * (el.scaleX || 1);
        const py = el.points[i + 1] * (el.scaleY || 1);
        const absX = ex + px * cos - py * sin;
        const absY = ey + px * sin + py * cos;
        if (Math.hypot(absX - pos.x, absY - pos.y) <= SNAP_DIST) {
          snapX = absX;
          snapY = absY;
          break;
        }
      }
    }
    if (snapX !== pos.x) break;
  }
  return { x: snapX, y: snapY };
}