import type { CanvasElement } from './types';

/**
 * Reuse old element/page references when content is unchanged.
 *
 * When a remote board update arrives, JSON.parse creates fresh objects for
 * every page and element. React.memo in ElementRenderer compares element
 * references — new references mean every element re-renders, even when only
 * one stroke changed on one page.
 *
 * By reconciling against the previous state, we keep the same object
 * references for anything unchanged, so React.memo hits and Konva skips
 * re-drawing those nodes.
 *
 * Returns the previous top-level array reference itself when nothing at all
 * changed, so `setPages(prev)` becomes a React bail-out.
 */
export function reconcileBoard(
  prev: CanvasElement[][] | null | undefined,
  next: CanvasElement[][],
): CanvasElement[][] {
  if (!prev || prev.length === 0) return next;

  const len = Math.max(prev.length, next.length);
  let anyPageChanged = false;
  const result = new Array<CanvasElement[]>(next.length);

  for (let i = 0; i < len; i += 1) {
    const prevPage = prev[i];
    const nextPage = next[i];
    if (!nextPage) continue; // page removed (next shorter than prev)
    if (!prevPage) {
      result[i] = nextPage;
      anyPageChanged = true;
      continue;
    }
    const mergedPage = reconcilePage(prevPage, nextPage);
    result[i] = mergedPage;
    if (mergedPage !== prevPage) anyPageChanged = true;
  }

  // Whole board unchanged → return previous top-level array so setPages bails out.
  if (!anyPageChanged && prev.length === next.length) return prev;
  return result;
}

function reconcilePage(
  prevPage: CanvasElement[],
  nextPage: CanvasElement[],
): CanvasElement[] {
  if (prevPage === nextPage) return prevPage;

  // Fast path: same length and every element is already reference-equal
  if (prevPage.length === nextPage.length) {
    let allSame = true;
    for (let i = 0; i < nextPage.length; i += 1) {
      if (prevPage[i] !== nextPage[i]) {
        allSame = false;
        break;
      }
    }
    if (allSame) return prevPage;
  }

  // Build id→old element map once
  const oldById = new Map<string, CanvasElement>();
  for (const el of prevPage) oldById.set(el.id, el);

  let reused = 0;
  const merged = new Array<CanvasElement>(nextPage.length);
  for (let i = 0; i < nextPage.length; i += 1) {
    const nextEl = nextPage[i];
    const oldEl = oldById.get(nextEl.id);
    if (oldEl && shallowEqualElement(oldEl, nextEl)) {
      merged[i] = oldEl;
      reused += 1;
    } else {
      merged[i] = nextEl;
    }
  }

  // If everything was reused AND order/size match, keep the whole array ref.
  if (reused === nextPage.length && prevPage.length === nextPage.length) {
    return prevPage;
  }
  return merged;
}

/**
 * Shallow equality with array-value comparison for `points`, `edgeColors`,
 * `edgeWidths`, `cropRegion`, etc. JSON round-tripping recreates arrays but
 * keeps their values identical, so numeric `===` is safe here.
 */
function shallowEqualElement(a: CanvasElement, b: CanvasElement): boolean {
  if (a === b) return true;

  // ✅ ორმაგი cast — TypeScript-ს ვერ ხვდება პირდაპირ
  const aRec = a as unknown as Record<string, unknown>;
  const bRec = b as unknown as Record<string, unknown>;

  const aKeys = Object.keys(aRec);
  const bKeys = Object.keys(bRec);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    const av = aRec[key];
    const bv = bRec[key];
    if (av === bv) continue;

    if (Array.isArray(av) && Array.isArray(bv)) {
      if (av.length !== bv.length) return false;
      let equal = true;
      for (let i = 0; i < av.length; i += 1) {
        if (av[i] !== bv[i]) {
          equal = false;
          break;
        }
      }
      if (!equal) return false;
      continue;
    }

    // cropRegion: plain object from JSON
    if (
      av !== null &&
      bv !== null &&
      typeof av === 'object' &&
      typeof bv === 'object' &&
      !Array.isArray(av) &&
      !Array.isArray(bv)
    ) {
      const aObj = av as Record<string, unknown>;
      const bObj = bv as Record<string, unknown>;
      const aOKeys = Object.keys(aObj);
      const bOKeys = Object.keys(bObj);
      if (aOKeys.length !== bOKeys.length) return false;
      let equal = true;
      for (const ok of aOKeys) {
        if (aObj[ok] !== bObj[ok]) {
          equal = false;
          break;
        }
      }
      if (equal) continue;
    }

    return false;
  }
  return true;
}