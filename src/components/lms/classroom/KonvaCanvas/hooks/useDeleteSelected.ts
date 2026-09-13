import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { CanvasElement } from '../utils/types';

interface UseDeleteSelectedOptions {
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  elementsRef: MutableRefObject<CanvasElement[]>;
  onElementsChange: (elements: CanvasElement[], options?: { commitHistory?: boolean }) => void;
}

export function useDeleteSelected({
  selectedIds,
  setSelectedIds,
  elementsRef,
  onElementsChange,
}: UseDeleteSelectedOptions) {
  return useCallback(() => {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    const remaining = elementsRef.current.filter((el) => !selectedSet.has(el.id));
    elementsRef.current = remaining;
    onElementsChange(remaining);
    setSelectedIds([]);
  }, [selectedIds, setSelectedIds, elementsRef, onElementsChange]);
}