'use client';

import { useEffect } from 'react';

export function useUndoRedoEvents(handleUndo: () => void, handleRedo: () => void) {
  useEffect(() => {
    const onUndoEvent = () => handleUndo();
    const onRedoEvent = () => handleRedo();

    window.addEventListener('whiteboard-undo', onUndoEvent);
    window.addEventListener('whiteboard-redo', onRedoEvent);

    return () => {
      window.removeEventListener('whiteboard-undo', onUndoEvent);
      window.removeEventListener('whiteboard-redo', onRedoEvent);
    };
  }, [handleUndo, handleRedo]);
}