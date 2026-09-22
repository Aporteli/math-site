'use client';

import { CheckCircle2, Download, Layers, X } from 'lucide-react';
import { isImageString } from '../helpers/student-assignment.helpers';

interface MaterialPreviewModalProps {
  modal: {
    url: string;
    title: string;
    isAnswer?: boolean;
    instructions?: string | null;
  };
  onClose: () => void;
}

export function MaterialPreviewModal({ modal, onClose }: MaterialPreviewModalProps) {
  const isImg = isImageString(modal.url);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}>
      <div
        className="flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-hairline bg-surface shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}>
        <div className={`h-1 shrink-0 ${modal.isAnswer ? 'bg-win' : 'bg-brass'}`} aria-hidden="true" />
        <div className="flex shrink-0 items-center justify-between border-b border-hairline bg-surface px-5 py-4">
          <div className="flex min-w-0 items-center gap-3 pr-2">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${
                modal.isAnswer
                  ? 'border-win/20 bg-win-tint text-win'
                  : 'border-brass/25 bg-brass-tint text-brass-strong'
              }`}
            >
              {modal.isAnswer ? <CheckCircle2 className="size-5" /> : <Layers className="size-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-ink truncate">{modal.title}</h3>
              {modal.instructions && modal.instructions !== 'მასალა' && (
                <p className="text-xs text-muted mt-0.5 truncate">{modal.instructions}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={modal.url}
              target="_blank"
              rel="noreferrer"
              download
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-navy-strong">
              <Download className="size-3.5" />
              <span>გადმოწერა</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 cursor-pointer items-center justify-center rounded-xl border border-hairline bg-paper text-muted transition hover:bg-paper-deep hover:text-ink">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* კონტენტის ბუდე: Lichess-ის მუქი ნახშირისფერი ფონი */}
        <div className="flex flex-1 items-center justify-center overflow-hidden bg-paper p-3">
          {isImg ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={modal.url}
              alt={modal.title}
              className="max-h-full max-w-full object-contain rounded-lg shadow-md"
            />
          ) : (
            <iframe src={modal.url} title={modal.title} className="w-full h-full rounded-lg bg-surface border-0" />
          )}
        </div>
      </div>
    </div>
  );
}