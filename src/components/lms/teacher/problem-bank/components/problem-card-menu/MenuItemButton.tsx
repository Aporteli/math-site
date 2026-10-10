'use client';

import type { MenuItem } from './types';

export function MenuItemButton({ item }: { item: MenuItem }) {
  const Icon = item.icon;

  return (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        className={[
          'flex w-full items-center gap-2.5 rounded-box px-3 py-2.5 text-left text-sm font-medium transition-colors',
          item.danger
            ? 'text-brass-strong hover:bg-brass-tint/50'
            : item.highlight
              ? 'text-navy bg-navy-tint/40 hover:bg-navy-tint font-bold'
              : 'text-body hover:bg-paper hover:text-navy',
        ].join(' ')}
        onClick={item.onClick}>
        <Icon className={`size-4 shrink-0 ${item.highlight ? 'text-navy' : ''}`} aria-hidden="true" />
        <span>{item.label}</span>
      </button>
    </li>
  );
}
