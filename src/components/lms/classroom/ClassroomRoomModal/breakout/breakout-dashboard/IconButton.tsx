'use client';

import { Headphones } from 'lucide-react';

export function IconButton({
  label,
  pressed,
  onClick,
  icon: Icon,
  compact,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  icon: typeof Headphones;
  /** true → მხოლოდ ხატულა, ტექსტი იმალება */
  compact: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex min-w-0 shrink-0 items-center justify-center gap-1 rounded-box text-[10px] font-bold ${
        compact ? 'size-7 p-0' : 'px-2 py-1'
      } ${pressed ? 'bg-[#465D73] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]' : 'border border-hairline bg-sectionHeader text-mainText hover:bg-mainButtonHover'}`}>
      <Icon className="size-3 shrink-0" />

      {!compact && <span className="truncate">{label}</span>}
    </button>
  );
}
