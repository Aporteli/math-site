import type { CanvasElement } from '../types';

const SCREEN_THRESHOLD = 12;

export type MergeMode = 'append' | 'prepend' | 'reverseTarget' | 'reverseNew';

function isMergeableStroke(el: CanvasElement): boolean {
  return el.type === 'freedraw' || el.type === 'line';
}

function reversePoints(pts: number[]): number[] {
  const out: number[] = new Array(pts.length);
  const n = pts.length;
  for (let i = 0, j = 0; i < n; i += 2, j += 2) {
    out[j] = pts[n - 2 - i];
    out[j + 1] = pts[n - 1 - i];
  }
  return out;
}

/** Apply the element's x/y offset to a flat point array → world coords. */
function toWorldPoints(el: CanvasElement): number[] {
  const pts = (el.points ?? []) as number[];
  const ox = (el as any).x ?? 0;
  const oy = (el as any).y ?? 0;
  if (!ox && !oy) return pts;
  const out = new Array(pts.length);
  for (let i = 0; i < pts.length; i += 2) {
    out[i] = pts[i] + ox;
    out[i + 1] = pts[i + 1] + oy;
  }
  return out;
}

export function findMergeCandidate(
  newElem: CanvasElement,
  existing: CanvasElement[],
  scale: number = 1,
): { target: CanvasElement; mode: MergeMode } | null {
  if (!isMergeableStroke(newElem)) return null;

  const np = toWorldPoints(newElem);
  if (np.length < 4) return null;

  const nStartX = np[0];
  const nStartY = np[1];
  const nEndX = np[np.length - 2];
  const nEndY = np[np.length - 1];

  const threshold = SCREEN_THRESHOLD / (scale || 1);
  const t2 = threshold * threshold;

  for (const el of existing) {
    if (el.id === newElem.id) continue;
    if (!isMergeableStroke(el)) continue;

    const ep = toWorldPoints(el);
    if (ep.length < 4) continue;

    const eStartX = ep[0];
    const eStartY = ep[1];
    const eEndX = ep[ep.length - 2];
    const eEndY = ep[ep.length - 1];

    // 1. target.end ↔ new.start → append
    if ((eEndX - nStartX) ** 2 + (eEndY - nStartY) ** 2 <= t2) {
      return { target: el, mode: 'append' };
    }
    // 2. target.start ↔ new.end → prepend
    if ((eStartX - nEndX) ** 2 + (eStartY - nEndY) ** 2 <= t2) {
      return { target: el, mode: 'prepend' };
    }
    // 3. target.start ↔ new.start → reverse target, then append new
    if ((eStartX - nStartX) ** 2 + (eStartY - nStartY) ** 2 <= t2) {
      return { target: el, mode: 'reverseTarget' };
    }
    // 4. target.end ↔ new.end → append reversed new
    if ((eEndX - nEndX) ** 2 + (eEndY - nEndY) ** 2 <= t2) {
      return { target: el, mode: 'reverseNew' };
    }
  }

  return null;
}

export function mergeStrokes(
  target: CanvasElement,
  newElem: CanvasElement,
  mode: MergeMode,
): CanvasElement {
  const tp = toWorldPoints(target);
  const np = toWorldPoints(newElem);

  let points: number[];
  switch (mode) {
    case 'append':        points = tp.concat(np); break;
    case 'prepend':       points = np.concat(tp); break;
    case 'reverseTarget': points = reversePoints(tp).concat(np); break;
    case 'reverseNew':    points = tp.concat(reversePoints(np)); break;
  }

  // The merged element is authored in absolute world coordinates.
  return { ...target, points, x: 0, y: 0 } as CanvasElement;
}