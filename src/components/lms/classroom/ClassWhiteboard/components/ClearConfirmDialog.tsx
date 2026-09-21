'use client';

import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  onCancel: () => void;
  onConfirm: () => void;
}

export function ClearConfirmDialog({ onCancel, onConfirm }: Props) {
  return (
    <ConfirmDialog
      title="დაფის გასუფთავება"
      description="ნამდვილად გსურთ ამ გვერდის სრულად წაშლა? ამ მოქმედების უკან დაბრუნება შეუძლებელია."
      confirmLabel="წაშლა"
      cancelLabel="გაუქმება"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}