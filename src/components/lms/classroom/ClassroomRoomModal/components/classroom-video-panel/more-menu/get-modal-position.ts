/** Approximate modal footprint used for viewport clamping. */
const MODAL_WIDTH = 190;
const MODAL_HEIGHT = 120;
const GAP = 10;

/**
 * Computes a fixed-position anchor for the student popup relative to
 * the clicked list item. Flips to the left / clamps vertically when the
 * modal would overflow the viewport.
 */
export function getModalPosition(rect: DOMRect): { x: number; y: number } {
  let x = rect.right + GAP;
  if (x + MODAL_WIDTH > window.innerWidth) {
    x = rect.left - MODAL_WIDTH;
  }

  let y = rect.top;
  if (y + MODAL_HEIGHT > window.innerHeight) {
    y = window.innerHeight - MODAL_HEIGHT - GAP;
  }

  return { x: Math.max(GAP, x), y: Math.max(GAP, y) };
}