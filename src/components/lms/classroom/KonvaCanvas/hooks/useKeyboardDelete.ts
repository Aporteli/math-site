import { useEffect } from 'react';

export function useKeyboardDelete(
  editingTextId: string | null,
  selectedId: string | null,
  deleteSelected: () => void,
) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (editingTextId) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        deleteSelected();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingTextId, selectedId, deleteSelected]);
}