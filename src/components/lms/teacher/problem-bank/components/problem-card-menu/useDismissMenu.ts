'use client';

import { useEffect, type RefObject } from 'react';

export function useDismissMenu(
  open: boolean,
  setOpen: (open: boolean) => void,
  rootRef: RefObject<HTMLDivElement | null>,
  menuRef: RefObject<HTMLUListElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, setOpen, rootRef, menuRef]);
}
