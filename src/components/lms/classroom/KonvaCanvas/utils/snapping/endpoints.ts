import type { CanvasElement } from '../types';

const SCREEN_THRESHOLD = 12;

type Box = { minX: number; minY: number; maxX: number; maxY: number };

const endpointBoxes = new WeakMap<CanvasElement, { box: Box; points: number[]; x: number; y: number }>();

function endpointBox(el: CanvasElement): Box | null {
  const pts = el.points;
  if (!pts || pts.length < 2) return null;
  const x = el.x || 0;
  const y = el.y || 0;
  const cached = endpointBoxes.get(el);
  if (cached && cached.points === pts && cached.x === x && cached.y === y) return cached.box;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    const wx = pts[i] + x;
    const wy = pts[i + 1] + y;
    if (wx < minX) minX = wx;
    if (wy < minY) minY = wy;
    if (wx > maxX) maxX = wx;
    if (wy > maxY) maxY = wy;
  }
  const box = { minX, minY, maxX, maxY };
  endpointBoxes.set(el, { box, points: pts, x, y });
  return box;
}

export function findNearbyEndpoint(
  pos: { x: number; y: number },
  elements: CanvasElement[],
  scale: number = 1,
): { x: number; y: number } | null {
  const threshold = SCREEN_THRESHOLD / (scale || 1);
  const t2 = threshold * threshold;

  let best: { x: number; y: number } | null = null;
  let bestD2 = t2;

  for (const el of elements) {
    const pts = (el as any).points as number[] | undefined;
    if (!pts || pts.length < 2) continue;

    const ox = (el as any).x ?? 0;
    const oy = (el as any).y ?? 0;
    const box = endpointBox(el);
    if (box && (pos.x < box.minX - threshold || pos.x > box.maxX + threshold || pos.y < box.minY - threshold || pos.y > box.maxY + threshold)) {
      continue;
    }

    for (let i = 0; i < pts.length - 1; i += 2) {
      const wx = pts[i] + ox;
      const wy = pts[i + 1] + oy;
      const dx = pos.x - wx;
      const dy = pos.y - wy;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = { x: wx, y: wy };
      }
    }
  }

  return best;
}