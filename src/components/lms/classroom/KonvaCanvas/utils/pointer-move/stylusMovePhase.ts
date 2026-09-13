import type { MutableRefObject } from 'react';

export interface StylusMovePhaseContext {
  stylusOnly: boolean;
  isStylusActiveRef: MutableRefObject<boolean>;
  stylusPrimaryHeldRef: MutableRefObject<boolean>;
  stylusSecondaryHeldRef: MutableRefObject<boolean>;
  syncStylusButtonsFromEvent: (evt: PointerEvent, phase: 'down' | 'move' | 'up' | 'cancel') => void;
}

/**
 * Handles the stylus/touch gating that happens at the top of every pointer-move.
 * Returns `true` when the caller should stop handling the move event.
 */
export function stylusMovePhase(ctx: StylusMovePhaseContext, evt: PointerEvent): boolean {
  if (ctx.stylusOnly && evt.pointerType === 'touch') return true;

  if (evt.pointerType === 'pen') {
    ctx.syncStylusButtonsFromEvent(evt, 'move');
  }

  if (evt.pointerType === 'touch' && ctx.isStylusActiveRef.current) return true;

  return false;
}