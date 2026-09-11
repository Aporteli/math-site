'use client';

import { useEffect, type RefObject } from 'react';

export function useScrollLock(containerRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const preventScroll = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      if (el.scrollTop !== 0) el.scrollTop = 0;
      if (el.scrollLeft !== 0) el.scrollLeft = 0;
    };

    window.addEventListener('scroll', preventScroll, { passive: true });
    el.addEventListener('scroll', preventScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', preventScroll);
      el.removeEventListener('scroll', preventScroll);
    };
  }, [containerRef]);
}