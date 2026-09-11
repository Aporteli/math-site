'use client';

import { useEffect, type RefObject } from 'react';

interface UseClickOutsideMenusOptions {
  penMenuRef: RefObject<HTMLDivElement | null>;
  eraserMenuRef: RefObject<HTMLDivElement | null>;
  shapesMenuRef: RefObject<HTMLDivElement | null>;
  colorMenuRef: RefObject<HTMLDivElement | null>;
  stylusMenuRef: RefObject<HTMLDivElement | null>;
  imageMenuRef: RefObject<HTMLDivElement | null>;
  pagesTrayRef: RefObject<HTMLDivElement | null>;
  closePenMenu: () => void;
  closeEraserMenu: () => void;
  closeShapesMenu: () => void;
  closeColorMenu: () => void;
  closeStylusMenu: () => void;
  closeImageMenu: () => void;
  closePagesTray: () => void;
}

export function useClickOutsideMenus(opts: UseClickOutsideMenusOptions) {
  const {
    penMenuRef, eraserMenuRef, shapesMenuRef, colorMenuRef, stylusMenuRef, imageMenuRef, pagesTrayRef,
    closePenMenu, closeEraserMenu, closeShapesMenu, closeColorMenu, closeStylusMenu, closeImageMenu, closePagesTray,
  } = opts;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (penMenuRef.current && !penMenuRef.current.contains(e.target as Node)) closePenMenu();
      if (eraserMenuRef.current && !eraserMenuRef.current.contains(e.target as Node)) closeEraserMenu();
      if (shapesMenuRef.current && !shapesMenuRef.current.contains(e.target as Node)) closeShapesMenu();
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) closeColorMenu();
      if (stylusMenuRef.current && !stylusMenuRef.current.contains(e.target as Node)) closeStylusMenu();
      if (imageMenuRef.current && !imageMenuRef.current.contains(e.target as Node)) closeImageMenu();
      if (pagesTrayRef.current && !pagesTrayRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-tray-trigger]')) closePagesTray();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}