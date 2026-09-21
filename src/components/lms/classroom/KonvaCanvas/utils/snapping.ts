import type { CanvasElement } from '../utils/types';

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