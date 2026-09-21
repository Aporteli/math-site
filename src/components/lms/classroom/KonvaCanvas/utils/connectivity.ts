import type { CanvasElement } from './types';

/** Tolerance in world units for "same point". */
const EPS = 0.75;

type Pt = [number, number];

function worldEndpoints(el: CanvasElement): Pt[] {
  const p = (el as any).points as number[] | undefined;
  if (!p || p.length < 4) return [];
  const ox = (el as any).x ?? 0;
  const oy = (el as any).y ?? 0;
  return [
    [p[0] + ox, p[1] + oy],
    [p[p.length - 2] + ox, p[p.length - 1] + oy],
  ];
}

function worldAllVertices(el: CanvasElement): Pt[] {
  const p = (el as any).points as number[] | undefined;
  if (!p || p.length < 2) return [];
  const ox = (el as any).x ?? 0;
  const oy = (el as any).y ?? 0;
  const out: Pt[] = [];
  for (let i = 0; i < p.length - 1; i += 2) {
    out.push([p[i] + ox, p[i + 1] + oy]);
  }
  return out;
}

function ptsMatch(a: Pt, b: Pt): boolean {
  return Math.abs(a[0] - b[0]) <= EPS && Math.abs(a[1] - b[1]) <= EPS;
}

/**
 * Two elements are "connected" when an endpoint of one sits on ANY vertex
 * of the other (endpoint or interior junction). This is what lets a third
 * line drawn onto the junction of an already-merged A+B be treated as
 * connected to the merged stroke.
 */
function areConnected(a: CanvasElement, b: CanvasElement): boolean {
  const aEnds = worldEndpoints(a);
  const bVerts = worldAllVertices(b);
  for (const ea of aEnds) {
    for (const vb of bVerts) {
      if (ptsMatch(ea, vb)) return true;
    }
  }
  const bEnds = worldEndpoints(b);
  const aVerts = worldAllVertices(a);
  for (const eb of bEnds) {
    for (const va of aVerts) {
      if (ptsMatch(eb, va)) return true;
    }
  }
  return false;
}

export function findConnectedIds(
  startId: string,
  elements: CanvasElement[],
): Set<string> {
  const visited = new Set<string>([startId]);
  const queue: string[] = [startId];

  while (queue.length) {
    const id = queue.shift()!;
    const el = elements.find((e) => e.id === id);
    if (!el) continue;
    for (const other of elements) {
      if (visited.has(other.id)) continue;
      if (areConnected(el, other)) {
        visited.add(other.id);
        queue.push(other.id);
      }
    }
  }

  return visited;
}