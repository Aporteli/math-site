'use client';

import type { ReactNode } from 'react';

export function ToolButton({
  title,
  onClick,
  active,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex size-8 shrink-0 items-center justify-center rounded-box transition-colors',
        active ? 'bg-[#465D73] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)]' : 'text-mainText hover:bg-mainButtonHover',
        disabled ? 'pointer-events-none opacity-40' : '',
      ].join(' ')}>
      {children}
    </button>
  );
}
