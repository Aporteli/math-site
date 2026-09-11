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
    <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-80 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-in zoom-in-95 duration-150">
        <div
          className={`mx-auto flex size-12 items-center justify-center rounded-full mb-3 ${
            tone === 'danger'
              ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-500'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
          }`}>
          {icon ?? <AlertTriangle className="size-6" />}
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">{description}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold text-white shadow-xs transition-colors ${
              tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-700 hover:bg-slate-800'
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
