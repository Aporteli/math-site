import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { isPenBarrelButton } from '../utils/pointer';

interface UseGlobalPointerHandlersOptions {
  syncStylusButtonsFromEvent: (evt: PointerEvent, phase: 'down' | 'move' | 'up' | 'cancel') => void;
  commitErase: () => void;
  isLasering: MutableRefObject<boolean>;
  triggerLaserFade: () => void;
  onLaserMove?: (pos: { x: number; y: number } | null) => void;
}

export function useGlobalPointerHandlers({
  syncStylusButtonsFromEvent,
  commitErase,
  isLasering,
  triggerLaserFade,
  onLaserMove,
}: UseGlobalPointerHandlersOptions) {
  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'pen') {
        syncStylusButtonsFromEvent(e, 'up');
        if (isPenBarrelButton(e.button) && (e.buttons & 1) !== 0) return;
      }
      commitErase();
      if (isLasering.current) {
        isLasering.current = false;
        triggerLaserFade();
        onLaserMove?.(null);
      }
    };
    const handleGlobalPointerCancel = (e: PointerEvent) => {
      if (e.pointerType === 'pen') {
        syncStylusButtonsFromEvent(e, 'cancel');
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerCancel);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerCancel);
    };
  }, [triggerLaserFade, onLaserMove, syncStylusButtonsFromEvent, commitErase, isLasering]);
}