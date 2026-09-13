import type { MutableRefObject } from 'react';

export interface ReleasePointerOwnershipContext {
  activePointerIdRef: MutableRefObject<number | null>;
  isStylusActiveRef: MutableRefObject<boolean>;
}

/**
 * Releases any pointer-level bookkeeping: active pointer id, deferred
 * stylus-active flag (cleared 200ms later), and the pending long-press timer.
 */
export function releasePointerOwnership(
  ctx: ReleasePointerOwnershipContext,
  evt: PointerEvent,
): void {
  if (evt.pointerId === ctx.activePointerIdRef.current) {
    ctx.activePointerIdRef.current = null;
  }

  if (evt.pointerType === 'pen') {
    setTimeout(() => {
      ctx.isStylusActiveRef.current = false;
    }, 200);
  }
}