import type { CanvasElement } from '@/components/lms/classroom/KonvaCanvas/utils/types';

export const HISTORY_LIMIT = 50;

export function capHistory(states: CanvasElement[][], index: number): { states: CanvasElement[][]; index: number } {
  if (states.length <= HISTORY_LIMIT) return { states, index };
  const extra = states.length - HISTORY_LIMIT;
  return { states: states.slice(extra), index: Math.max(0, index - extra) };
}

export const elementJsonCache = new WeakMap<CanvasElement, string>();

export function stringifyPages(pages: CanvasElement[][]): string {
  const pageParts = new Array<string>(pages.length);
  for (let p = 0; p < pages.length; p += 1) {
    const page = pages[p] || [];
    const parts = new Array<string>(page.length);
    for (let i = 0; i < page.length; i += 1) {
      const el = page[i];
      let elJson = elementJsonCache.get(el);
      if (elJson === undefined) {
        elJson = JSON.stringify(el) ?? 'null';
        elementJsonCache.set(el, elJson);
      }
      parts[i] = elJson;
    }
    pageParts[p] = `[${parts.join(',')}]`;
  }
  return `[${pageParts.join(',')}]`;
}
