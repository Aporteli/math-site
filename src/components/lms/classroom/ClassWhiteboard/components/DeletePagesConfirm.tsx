'use client';

import type { Dispatch, SetStateAction } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  pendingDelete: number[] | null;
  onDelete: (indices: number[]) => void;
  setPendingDelete: Dispatch<SetStateAction<number[] | null>>;
}

export function DeletePagesConfirm({ pendingDelete, onDelete, setPendingDelete }: Props) {
  if (pendingDelete === null) return null;
  return (
    <ConfirmDialog
      title={pendingDelete.length === 1 ? 'დაფის წაშლა' : 'დაფების წაშლა'}
      description={
        pendingDelete.length === 1
          ? 'ნამდვილად გსურთ ამ დაფის წაშლა? ამ მოქმედების უკან დაბრუნება შეუძლებელია.'
          : `ნამდვილად გსურთ ${pendingDelete.length} დაფის წაშლა? ამ მოქმედების უკან დაბრუნება შეუძლებელია.`
      }
      confirmLabel="წაშლა"
      cancelLabel="გაუქმება"
      onCancel={() => setPendingDelete(null)}
      onConfirm={() => {
        onDelete(pendingDelete);
        setPendingDelete(null);
      }}
    />
  );
}
