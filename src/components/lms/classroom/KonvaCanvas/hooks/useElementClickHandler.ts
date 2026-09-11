import { useCallback } from 'react';
import type { CanvasElement } from '../utils/types';

interface UseElementClickHandlerOptions {
  activeTool: string;
  setSelectedId: (id: string | null) => void;
  startTextInlineEditing: (el: CanvasElement) => void;
}

export function useElementClickHandler({
  activeTool,
  setSelectedId,
  startTextInlineEditing,
}: UseElementClickHandlerOptions) {
  return useCallback(
    (el: CanvasElement) => {
      if (activeTool === 'select') {
        setSelectedId(el.id);
        if (el.type === 'text') startTextInlineEditing(el);
      }
    },
    [activeTool, setSelectedId, startTextInlineEditing],
  );
}