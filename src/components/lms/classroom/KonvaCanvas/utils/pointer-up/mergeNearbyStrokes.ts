import type { CanvasElement } from '../types';

const DEFAULT_THRESHOLD = 10;

export function findMergeCandidate(
  newElem: CanvasElement,
  existing: CanvasElement[],
  threshold = DEFAULT_THRESHOLD,
): { target: CanvasElement; prepend: boolean } | null {
  if (newElem.type !== 'freedraw' || !newElem.points || newElem.points.length < 4) {
    return null;
  }

  const np = newElem.points;
  const nStartX = np[0];
  const nStartY = np[1];
  const nEndX = np[np.length - 2];
  const nEndY = np[np.length - 1];
  const t2 = threshold * threshold;

  for (const el of existing) {
    if (el.id === newElem.id) continue;
    if (el.type !== 'freedraw' || !el.points || el.points.length < 4) continue;

    const ep = el.points;
    const eStartX = ep[0];
    const eStartY = ep[1];
    const eEndX = ep[ep.length - 2];
    const eEndY = ep[ep.length - 1];

    // new.start meets existing.end  →  existing + new
    if ((eEndX - nStartX) ** 2 + (eEndY - nStartY) ** 2 <= t2) {
      return { target: el, prepend: false };
    }
    // new.end meets existing.start  →  new + existing
    if ((eStartX - nEndX) ** 2 + (eStartY - nEndY) ** 2 <= t2) {
      return { target: el, prepend: true };
    }
  }

  return null;
}

export function mergeStrokes(
  target: CanvasElement,
  newElem: CanvasElement,
  prepend: boolean,
): CanvasElement {
  const tp = target.points ?? [];
  const np = newElem.points ?? [];
  return {
    ...target,
    points: prepend ? np.concat(tp) : tp.concat(np),
  };
}