'use client';

import type { LucideIcon } from 'lucide-react';

export function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-box px-3 text-xs font-bold transition-all duration-200 ${
        active ? 'text-mainText' : 'text-mainText/50 hover:text-mainText'
      }`}>
      <Icon className="relative z-10 size-3.5" />
      <span className="relative z-10">{label}</span>
      <span
        className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-all duration-300 ease-out ${
          active ? 'w-[calc(100%-12px)] bg-mainText' : 'w-0 bg-mainText/50 group-hover:w-1/2'
        }`}
      />
    </button>
  );
}
