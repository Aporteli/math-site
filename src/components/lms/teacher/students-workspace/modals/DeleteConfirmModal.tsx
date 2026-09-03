'use client';

import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({ isDeleting, onCancel, onConfirm }: DeleteConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => !isDeleting && onCancel()}>
      <div
        className="w-full max-w-sm rounded-3xl border border-hairline bg-paper p-6 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-500">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-ink">წაშლა</h4>
            <p className="text-xs text-muted mt-0.5">ეს ქმედება შეუქცევადია</p>
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-hairline bg-surface p-3 text-sm leading-relaxed text-body">
          დარწმუნებული ხართ, რომ გსურთ ამ ჩანაწერის წაშლა?
        </p>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="w-full sm:w-auto rounded-xl border border-hairline bg-surface px-4 py-2.5 text-sm font-bold text-ink hover:bg-paper-deep transition-colors disabled:opacity-50 cursor-pointer">
            გაუქმება
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 px-4 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-500/25 disabled:opacity-50 transition-colors shadow-inner active:scale-95 cursor-pointer">
            {isDeleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>იშლება...</span>
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                <span>დიახ, წაშლა</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}