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
        className="flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-hairline bg-paper shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}>
        {/* მოდალის ჰედერი Lichess-ის ზედაპირით */}
        <div className="flex items-center justify-between border-b border-hairline bg-surface px-6 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div
              className="flex size-10 items-center justify-center rounded-xl shrink-0 bg-brass-tint text-brass border border-brass/25">
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-paper-deep px-3.5 py-1.5 text-xs font-bold text-ink hover:bg-paper hover:text-brass transition-colors shadow-xs">
              <Download className="size-3.5 text-brass" />
              <span>გადმოწერა</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-xl border border-hairline bg-surface text-muted hover:text-ink hover:bg-paper-deep transition-colors">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* კონტენტის ბუდე: Lichess-ის მუქი ნახშირისფერი ფონი */}
        <div className="flex-1 bg-paper-deep/80 p-2 overflow-hidden flex items-center justify-center">
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