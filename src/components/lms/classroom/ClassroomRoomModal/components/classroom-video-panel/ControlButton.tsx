'use client';

import type { LucideIcon } from 'lucide-react';

const IDLE =
  'border-white/10 bg-white/5 text-white/80 hover:bg-white/15 hover:text-white';

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
  activeClass = 'border-blue-500 bg-blue-600 text-white',
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
      className={`flex size-9 items-center justify-center rounded-xl border transition-all ${state}`}
    >
      <Icon className="size-4" />
    </button>
  );
}