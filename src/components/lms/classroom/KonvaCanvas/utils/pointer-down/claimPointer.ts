import type { MutableRefObject } from 'react';

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