import { useEffect } from 'react';

export function useKeyboardDelete(
  editingTextId: string | null,
  selectedIds: string[],
  deleteSelected: () => void,
) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (editingTextId) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIds.length > 0) {
        event.preventDefault();
        deleteSelected();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingTextId, selectedIds, deleteSelected]);
}