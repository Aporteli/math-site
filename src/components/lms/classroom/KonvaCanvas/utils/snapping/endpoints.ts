import type { CanvasElement } from '../types';

/**
 * How close (world px) the cursor must be to an existing freedraw endpoint
 * for the new stroke's endpoint to be snapped onto it exactly.
 */
const DEFAULT_ENDPOINT_THRESHOLD = 12;

export interface EndpointHit {
  x: number;
  y: number;
  elementId: string;
  which: 'start' | 'end';
}

/**
 * Return the closest existing freedraw endpoint within `threshold` px of
 * `pos`, or null. The returned `x`/`y` are the *exact* endpoint coordinates,
 * so callers can snap the new point onto them verbatim.
 */
export function findNearbyEndpoint(
  pos: { x: number; y: number },
  elements: CanvasElement[],
  threshold = DEFAULT_ENDPOINT_THRESHOLD,
): EndpointHit | null {
  let best: EndpointHit | null = null;
  let bestDist2 = threshold * threshold;

  for (const el of elements) {
    if (el.type !== 'freedraw') continue;
    const p = el.points;
    if (!p || p.length < 2) continue;

    const sx = p[0];
    const sy = p[1];
    const ex = p[p.length - 2];
    const ey = p[p.length - 1];

    const ds = (sx - pos.x) ** 2 + (sy - pos.y) ** 2;
    if (ds <= bestDist2) {
      best = { x: sx, y: sy, elementId: el.id, which: 'start' };
      bestDist2 = ds;
    }
    const de = (ex - pos.x) ** 2 + (ey - pos.y) ** 2;
    if (de <= bestDist2) {
      best = { x: ex, y: ey, elementId: el.id, which: 'end' };
      bestDist2 = de;
    }
  }

  return best;
}