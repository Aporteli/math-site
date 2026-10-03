'use client';

import type { LucideIcon } from 'lucide-react';

const IDLE =
  'cursor-pointer border-hairline bg-main text-mainText hover:bg-mainButtonHover';

interface ControlButtonProps {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
  active?: boolean;
  /** Class string applied when `active` is true (and `keepIdleOnActive` is false). */
  activeClass?: string;
  /** When true, `activeClass` is *appended* to the idle classes instead of replacing them. */
  keepIdleOnActive?: boolean;
}

export function ControlButton({
  icon: Icon,
  title,
  onClick,
  active = false,
  activeClass = 'border-transparent bg-[#465D73] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)]',
  keepIdleOnActive = false,
}: ControlButtonProps) {
  const state = active
    ? keepIdleOnActive
      ? `${IDLE} ${activeClass}`
      : activeClass
    : IDLE;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex size-9 items-center justify-center rounded-box border transition-all ${state}`}
    >
      <Icon className="size-4" />
    </button>
  );
}