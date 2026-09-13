import { useCallback } from 'react';
import type { CanvasElement } from '../utils/types';

interface UseElementClickHandlerOptions {
  activeTool: string;
  setSelectedIds: (ids: string[]) => void;
  startTextInlineEditing: (el: CanvasElement) => void;
}

export function useElementClickHandler({
  activeTool,
  setSelectedIds,
  startTextInlineEditing,
}: UseElementClickHandlerOptions) {
  return useCallback(
    (el: CanvasElement) => {
      if (activeTool === 'select') {
        setSelectedIds([el.id]);
        if (el.type === 'text') startTextInlineEditing(el);
      }
    },
    [activeTool, setSelectedIds, startTextInlineEditing],
  );
}