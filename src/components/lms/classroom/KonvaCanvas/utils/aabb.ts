import type { CanvasElement } from './types';

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Computes an axis-aligned bounding box for a persisted element, in the same
 * (untransformed) stage coordinate space used to store `x`/`y`/`points`.
 *
 * Local geometry is defined around the element origin, then scaled, rotated and
 * translated to match Konva's node transform (translate → rotate → scale).
 */
export function getElementAABB(el: CanvasElement): AABB | null {
  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;

  if (
    el.type === 'freedraw' ||
    el.type === 'line' ||
    el.type === 'arrow' ||
    el.type === 'triangle' ||
    el.type === 'diamond'
  ) {
    if (!el.points || el.points.length < 2) return null;
    minX = Infinity;
    minY = Infinity;
    maxX = -Infinity;
    maxY = -Infinity;
    for (let i = 0; i < el.points.length; i += 2) {
      const px = el.points[i];
      const py = el.points[i + 1];
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
  } else if (el.type === 'circle' || el.type === 'star') {
    // x/y is the center for circles & stars.
    const r = el.radius || 0;
    minX = -r;
    minY = -r;
    maxX = r;
    maxY = r;
  } else if (el.type === 'rect' || el.type === 'image') {
    // x/y is the top-left corner.
    maxX = el.width || 0;
    maxY = el.height || 0;
  } else if (el.type === 'text') {
    maxX = el.width || 550;
    maxY = el.height || el.fontSize || 24;
  } else {
    return null;
  }

  const sx = el.scaleX || 1;
  const sy = el.scaleY || 1;
  const rotation = el.rotation || 0;
  const ox = el.x || 0;
  const oy = el.y || 0;

  const corners = [
    { x: minX * sx, y: minY * sy },
    { x: maxX * sx, y: minY * sy },
    { x: maxX * sx, y: maxY * sy },
    { x: minX * sx, y: maxY * sy },
  ];

  if (rotation !== 0) {
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    for (const c of corners) {
      const rx = c.x * cos - c.y * sin;
      const ry = c.x * sin + c.y * cos;
      c.x = rx;
      c.y = ry;
    }
  }

  let aMinX = Infinity;
  let aMinY = Infinity;
  let aMaxX = -Infinity;
  let aMaxY = -Infinity;
  for (const c of corners) {
    const ax = c.x + ox;
    const ay = c.y + oy;
    if (ax < aMinX) aMinX = ax;
    if (ax > aMaxX) aMaxX = ax;
    if (ay < aMinY) aMinY = ay;
    if (ay > aMaxY) aMaxY = ay;
  }

  return { minX: aMinX, minY: aMinY, maxX: aMaxX, maxY: aMaxY };
}

/** True when the two axis-aligned boxes overlap (or touch). */
export function aabbIntersects(a: AABB, b: AABB): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

/** Normalizes two arbitrary corner points into an AABB. */
export function aabbFromPoints(p1: { x: number; y: number }, p2: { x: number; y: number }): AABB {
  return {
    minX: Math.min(p1.x, p2.x),
    minY: Math.min(p1.y, p2.y),
    maxX: Math.max(p1.x, p2.x),
    maxY: Math.max(p1.y, p2.y),
  };
}
