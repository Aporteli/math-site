'use client';

import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import { MenuItemButton } from './MenuItemButton';
import type { MenuCoords, MenuItem } from './types';

interface ProblemCardDropdownProps {
  menuRef: RefObject<HTMLUListElement | null>;
  menuId: string;
  coords: MenuCoords | null;
  items: MenuItem[];
}

export function ProblemCardDropdown({ menuRef, menuId, coords, items }: ProblemCardDropdownProps) {
  return createPortal(
    <ul
      ref={menuRef}
      id={menuId}
      role="menu"
      style={coords ? { top: coords.top, left: coords.left } : { top: 0, left: 0, visibility: 'hidden' as const }}
      className="fixed z-[80] min-w-[14rem] origin-top-right animate-dropdown rounded-box border border-hairline bg-white p-1.5 shadow-lg shadow-navy/5"
      onClick={(event) => event.stopPropagation()}>
      {items.map((item) => (
        <MenuItemButton key={item.id} item={item} />
      ))}
    </ul>,
    document.body,
  );
}
