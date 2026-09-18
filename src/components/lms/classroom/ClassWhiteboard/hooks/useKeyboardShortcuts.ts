'use client';

import { useEffect } from 'react';

interface Options {
  handleUndo: () => void;
  handleRedo: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
  isLocked?: boolean;
}

export function useKeyboardShortcuts({
  handleUndo,
  handleRedo,
  handleZoomIn,
  handleZoomOut,
  handleZoomReset,
  isLocked = false,
}: Options) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || target?.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        if (isLocked) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        handleZoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        if (isLocked) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        handleZoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        if (isLocked) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        handleZoomReset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo, handleRedo, handleZoomIn, handleZoomOut, handleZoomReset, isLocked]);
}
