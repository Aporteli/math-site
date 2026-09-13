import type { MutableRefObject } from 'react';
import { isPenBarrelButton } from '../pointer';

export interface StylusUpPhaseContext {
  isStylusActiveRef: MutableRefObject<boolean>;
  syncStylusButtonsFromEvent: (evt: PointerEvent, phase: 'down' | 'move' | 'up' | 'cancel') => void;
}

/**
 * Handles the pen-barrel release at the start of pointer-up.
 * Returns `true` when the caller should stop handling the up event
 * (i.e. only the barrel button was released, the tip is still down).
 */
export function stylusUpPhase(ctx: StylusUpPhaseContext, evt: PointerEvent): boolean {
  if (evt.pointerType !== 'pen') return false;

  ctx.syncStylusButtonsFromEvent(evt, 'up');
  const tipStillDown = (evt.buttons & 1) !== 0;
  if (isPenBarrelButton(evt.button) && tipStillDown) {
    return true;
  }
  return false;
}