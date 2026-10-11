import type { CanvasElement } from '@/components/lms/classroom/KonvaCanvas/utils/types';

export const HISTORY_LIMIT = 50;

export function capHistory(
  states: CanvasElement[][],
  index: number,
): { states: CanvasElement[][]; index: number } {
  if (states.length <= HISTORY_LIMIT) return { states, index };
  const extra = states.length - HISTORY_LIMIT;
  return { states: states.slice(extra), index: Math.max(0, index - extra) };
}

/**
 * Per-element JSON cache.
 * reference → JSON string. თუ ელემენტი არ შეცვლილა — ხელახლა აღარ სტრინგიფიცირდება.
 */
export const elementJsonCache = new WeakMap<CanvasElement, string>();

/**
 * ✅ Per-page JSON cache.
 * გვერდის მასივის reference → სრული JSON string.
 *
 * `handleElementsChange` ყოველ ცვლილებაზე ქმნის ახალ გარე მასივს
 * (`[...pagesRef.current]`) და მხოლოდ შეცვლილ ინდექსს ცვლის.
 * დანარჩენი გვერდების მასივები იგივე reference-ებია → cache hit.
 *
 * ეფექტი: 20 გვერდი × 100 ელემენტი → 1 გვერდის ცვლილებაზე
 * მხოლოდ 100 JSON.stringify ნაცვლად 2000-ისა.
 */
const pageJsonCache = new WeakMap<CanvasElement[], string>();

export function stringifyPages(pages: CanvasElement[][]): string {
  const pageParts = new Array<string>(pages.length);
  for (let p = 0; p < pages.length; p += 1) {
    const page = pages[p];
    if (!page) {
      pageParts[p] = '[]';
      continue;
    }

    // ✅ per-page cache: თუ გვერდი არ შეცვლილა — პირდაპირ დაბრუნდეს
    const cachedPage = pageJsonCache.get(page);
    if (cachedPage !== undefined) {
      pageParts[p] = cachedPage;
      continue;
    }

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
    const pageJson = `[${parts.join(',')}]`;
    pageJsonCache.set(page, pageJson);
    pageParts[p] = pageJson;
  }
  return `[${pageParts.join(',')}]`;
}