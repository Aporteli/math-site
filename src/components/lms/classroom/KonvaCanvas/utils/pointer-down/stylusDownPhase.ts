import type { MutableRefObject } from 'react';
import { isPenBarrelButton } from '../pointer';

export interface StylusDownPhaseContext {
  stylusOnly: boolean;
  isStylusActiveRef: MutableRefObject<boolean>;
  syncStylusButtonsFromEvent: (evt: PointerEvent, phase: 'down' | 'move' | 'up' | 'cancel') => void;
}

/**
 * Handles the stylus/touch gating that happens before any tool logic.
 * Returns `true` when the caller should stop handling the pointer-down event.
 */
export function stylusDownPhase(ctx: StylusDownPhaseContext, evt: PointerEvent): boolean {
  if (ctx.stylusOnly && evt.pointerType === 'touch') return true;

  // Stylus-only mode: block touch (finger) input
  if (ctx.stylusOnly && evt.pointerType === 'touch') return true;

  if (evt.pointerType === 'touch' && ctx.isStylusActiveRef.current) return true;
  if (evt.pointerType === 'pen') {
    ctx.isStylusActiveRef.current = true;
    ctx.syncStylusButtonsFromEvent(evt, 'down');
    if (isPenBarrelButton(evt.button)) {
      evt.preventDefault();
      return true;
    }
  }
  return false;
}