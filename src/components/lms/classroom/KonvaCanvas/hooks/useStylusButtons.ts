import { useCallback, useRef } from 'react';
import { getHeldPenBarrelButtons } from '../utils/pointer';

export function useStylusButtons(
  onStylusButtonAction: ((buttonIndex: 1 | 2, state: 'down' | 'up') => void) | undefined,
) {
  const stylusPrimaryHeldRef = useRef(false);
  const stylusSecondaryHeldRef = useRef(false);
  const onStylusButtonActionRef = useRef(onStylusButtonAction);
  onStylusButtonActionRef.current = onStylusButtonAction;

  const syncStylusButtons = useCallback((primary: boolean, secondary: boolean) => {
    if (primary !== stylusPrimaryHeldRef.current) {
      stylusPrimaryHeldRef.current = primary;
      onStylusButtonActionRef.current?.(1, primary ? 'down' : 'up');
    }
    if (secondary !== stylusSecondaryHeldRef.current) {
      stylusSecondaryHeldRef.current = secondary;
      onStylusButtonActionRef.current?.(2, secondary ? 'down' : 'up');
    }
  }, []);

  const syncStylusButtonsFromEvent = useCallback(
    (evt: PointerEvent, phase: 'down' | 'move' | 'up' | 'cancel') => {
      if (evt.pointerType !== 'pen') return;
      let { primary, secondary } = getHeldPenBarrelButtons(evt);
      if (phase === 'down') {
        if (evt.button === 2 || evt.button === 5) primary = true;
        if (evt.button === 1) secondary = true;
      } else if (phase === 'up') {
        if (evt.button === 2 || evt.button === 5) primary = false;
        if (evt.button === 1) secondary = false;
      } else if (phase === 'cancel') {
        primary = false;
        secondary = false;
      }
      syncStylusButtons(primary, secondary);
    },
    [syncStylusButtons],
  );

  return {
    stylusPrimaryHeldRef,
    stylusSecondaryHeldRef,
    syncStylusButtonsFromEvent,
  };
}