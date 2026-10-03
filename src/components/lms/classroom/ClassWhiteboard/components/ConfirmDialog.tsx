'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'neutral';
  icon?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'წაშლა',
  cancelLabel = 'გაუქმება',
  tone = 'danger',
  icon,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div className="absolute inset-0 z-[150] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-in duration-150">
      <div className="w-80 animate-in rounded-box border border-hairline bg-paper p-6 text-center shadow-2xl zoom-in-95 duration-150">
        <div
          className={`mx-auto mb-3 flex size-11 items-center justify-center rounded-box ${
            tone === 'danger'
              ? 'border border-rose-500/20 bg-rose-500/10 text-rose-500'
              : 'border border-hairline bg-sectionHeader text-icons'
          }`}>
          {icon ?? <AlertTriangle className="size-5" />}
        </div>
        <h3 className="mb-1 text-base font-bold text-ink">{title}</h3>
        <p className="mb-5 text-xs leading-relaxed text-muted">{description}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 cursor-pointer rounded-box border border-hairline bg-surface px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-paper-deep">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 cursor-pointer rounded-box px-4 py-2.5 text-sm font-bold transition-all duration-200 active:scale-[0.98] ${
              tone === 'danger'
                ? 'border border-rose-500/30 bg-rose-500/15 text-rose-500 hover:bg-rose-500/25'
                : 'bg-[#465D73] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] hover:bg-[#526C85]'
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
