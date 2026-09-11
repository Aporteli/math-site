import type { MutableRefObject } from 'react';

/**
 * Claims the pointer id for this gesture. Returns `false` when another
 * pointer id already owns the gesture and the caller should bail.
 */
export function claimPointer(
  activePointerIdRef: MutableRefObject<number | null>,
  evt: PointerEvent,
): boolean {
  const pid = evt.pointerId ?? 1;
  if (activePointerIdRef.current !== null && activePointerIdRef.current !== pid) {
    return false;
  }
  activePointerIdRef.current = pid;
  return true;
}