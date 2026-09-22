'use client';

import { useState } from 'react';
import { X, ZoomIn, BookOpen, CheckCircle2, UploadCloud } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';

type Difficulty = 'easy' | 'medium' | 'hard' | 'olympiad';
type ProblemStatus = 'notStarted' | 'uploaded' | 'submitted' | 'graded';

export interface ProblemDetailModalProps {
  assignmentTitle: string;
  problem: {
    id: string;
    promptTex: string;
    topic: string;
    difficulty: Difficulty;
    status: ProblemStatus;
    fileName?: string;
    previewUrl?: string;
    teacherAttachmentUrl?: string | null;
    grade?: number;
    feedback?: string;
  };
  onClose: () => void;
  onFile?: (file: File) => Promise<void>;
  onRemoveFile?: () => void;
  onMarkSubmitted?: () => Promise<void>;
  onWithdraw?: () => void;
}

function parseImageUrls(raw?: string | null): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
      }
    } catch {
      // იგნორირება
    }
  }

  if (isImageString(trimmed)) {
    return [trimmed];
  }

  return [];
}

function isImageString(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.endsWith('.png') ||
    trimmed.endsWith('.jpg') ||
    trimmed.endsWith('.jpeg') ||
    trimmed.endsWith('.webp')
  );
}

export function ProblemDetailModal({
  assignmentTitle,
  problem,
  onClose,
}: ProblemDetailModalProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const isGraded = problem.status === 'graded';

  const teacherImageRaw =
    (isImageString(problem.teacherAttachmentUrl) ? problem.teacherAttachmentUrl : null) ||
    (isImageString(problem.promptTex) ? problem.promptTex : null);

  const teacherImages = parseImageUrls(teacherImageRaw);
  const hasTextPrompt = Boolean(
    problem.promptTex && !isImageString(problem.promptTex) && problem.promptTex.trim() !== '',
  );

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-hairline bg-surface shadow-2xl animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />
          <div className="flex items-center justify-between border-b border-hairline bg-surface px-5 py-4">
            <div className="flex min-w-0 items-center gap-3 pr-2">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${
                  isGraded ? 'border-win/20 bg-win-tint text-win' : 'border-navy/20 bg-navy-tint text-navy'
                }`}
              >
                {isGraded ? <CheckCircle2 className="size-5" /> : <BookOpen className="size-5" />}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-ink">
                  {assignmentTitle || problem.topic || 'დავალების დეტალები'}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-muted">{isGraded ? 'შეფასებული' : 'ამოცანის პირობა'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-hairline bg-paper text-muted transition hover:bg-paper-deep hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Body */}
          <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto bg-paper p-5">
            {hasTextPrompt && (
              <div className="rounded-xl border border-hairline bg-surface p-4 shadow-2xs">
                <KatexPreview tex={problem.promptTex} className="text-xs text-ink leading-relaxed" />
              </div>
            )}

            {isGraded && (
              <div className="rounded-xl border border-hairline/80 bg-paper-deep/60 px-3.5 py-2.5 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-win block">
                  მასწავლებლის შეფასება
                </span>
                {problem.grade !== undefined && (
                  <p className="text-sm font-bold text-ink">
                    ქულა: <span className="text-win">{problem.grade}</span>
                  </p>
                )}
                {problem.feedback && (
                  <p className="text-xs text-body leading-relaxed">{problem.feedback}</p>
                )}
              </div>
            )}

            {teacherImages.length > 0 ? (
              <div className="space-y-3">
                {teacherImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setExpandedImage(imgUrl)}
                    className="group relative flex items-center justify-center rounded-xl border border-hairline bg-white p-2 shadow-2xs cursor-zoom-in overflow-hidden transition-all hover:border-navy/60"
                  >
                    <img
                      src={imgUrl}
                      alt="დავალების სურათი"
                      className="max-h-[58vh] w-auto max-w-full rounded-lg object-contain"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface/95 border border-hairline px-3 py-1.5 text-xs font-bold text-ink shadow-lg backdrop-blur-xs">
                        <ZoomIn className="size-3.5 text-navy" /> სრულად გახსნა
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !hasTextPrompt && (
                <div className="rounded-xl border border-dashed border-hairline bg-surface/40 p-8 text-center">
                  <UploadCloud className="size-7 text-muted/50 mx-auto mb-2" />
                  <p className="text-xs font-bold text-ink">სურათი არ მოიძებნა</p>
                </div>
              )
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end border-t border-hairline bg-surface px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-navy-strong"
            >
              დახურვა
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-150 cursor-zoom-out"
          onClick={() => setExpandedImage(null)}
        >
          <button
            type="button"
            onClick={() => setExpandedImage(null)}
            className="absolute right-5 top-5 flex size-9 items-center justify-center rounded-xl bg-surface/80 border border-hairline text-white transition-colors hover:bg-surface"
          >
            <X className="size-5" />
          </button>
          <img
            src={expandedImage}
            alt="გადიდებული სურათი"
            className="max-h-[92vh] max-w-[94vw] rounded-xl object-contain shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}