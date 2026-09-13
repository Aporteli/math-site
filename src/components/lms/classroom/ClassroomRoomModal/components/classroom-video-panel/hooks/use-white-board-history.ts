'use client';

import { useCallback } from 'react';

/** Dispatches `whiteboard-undo` / `whiteboard-redo` events on window. */
export function useWhiteboardHistory() {
  const undo = useCallback(() => {
    window.dispatchEvent(new CustomEvent('whiteboard-undo'));
  }, []);

  const redo = useCallback(() => {
    window.dispatchEvent(new CustomEvent('whiteboard-redo'));
  }, []);

  return { undo, redo };
}