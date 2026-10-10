'use client';

import type { Dispatch, SetStateAction } from 'react';
import { ClearConfirmDialog } from './ClearConfirmDialog';

interface Props {
  open: boolean;
  onClear: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

export function ClearPageConfirm({ open, onClear, setOpen }: Props) {
  if (!open) return null;
  return (
    <ClearConfirmDialog
      onCancel={() => setOpen(false)}
      onConfirm={() => {
        onClear();
        setOpen(false);
      }}
    />
  );
}
