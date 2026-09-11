import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { CanvasElement } from '../utils/types';

interface UseDeleteSelectedOptions {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  elementsRef: MutableRefObject<CanvasElement[]>;
  onElementsChange: (elements: CanvasElement[], options?: { commitHistory?: boolean }) => void;
}

export function useDeleteSelected({
  selectedId,
  setSelectedId,
  elementsRef,
  onElementsChange,
}: UseDeleteSelectedOptions) {
  return useCallback(() => {
    if (!selectedId) return;
    const remaining = elementsRef.current.filter((el) => el.id !== selectedId);
    elementsRef.current = remaining;
    onElementsChange(remaining);
    setSelectedId(null);
  }, [selectedId, setSelectedId, elementsRef, onElementsChange]);
}