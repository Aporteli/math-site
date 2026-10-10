'use client';

import { useId, useRef, useState } from 'react';
import { useDismissMenu } from './useDismissMenu';
import { useMenuPosition } from './useMenuPosition';

export function useProblemCardMenu() {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const coords = useMenuPosition(open, triggerRef, menuRef);
  useDismissMenu(open, setOpen, rootRef, menuRef);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return { menuId, rootRef, triggerRef, menuRef, open, setOpen, coords, run };
}
