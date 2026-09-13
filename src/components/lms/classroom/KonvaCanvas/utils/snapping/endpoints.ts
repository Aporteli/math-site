import type { CanvasElement } from '../types';

const SCREEN_THRESHOLD = 12;

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