'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';
import type { MenuCoords } from './types';

export function useMenuPosition(
  open: boolean,
  triggerRef: RefObject<HTMLButtonElement | null>,
  menuRef: RefObject<HTMLUListElement | null>,
) {
  const [coords, setCoords] = useState<MenuCoords | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = menuRef.current?.offsetWidth ?? 220;
      const menuHeight = menuRef.current?.offsetHeight ?? 260;
      const gap = 6;
      const padding = 8;

      let top = rect.bottom + gap;
      let left = rect.right - menuWidth;

      if (left < padding) left = padding;
      if (left + menuWidth > window.innerWidth - padding) {
        left = Math.max(padding, window.innerWidth - menuWidth - padding);
      }
      if (top + menuHeight > window.innerHeight - padding) {
        top = Math.max(padding, rect.top - menuHeight - gap);
      }

      setCoords({ top, left });
    }

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, triggerRef, menuRef]);

  return coords;
}
