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
          className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-hairline bg-paper shadow-2xl animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-hairline bg-surface px-5 py-3.5">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div
                className={`flex size-7 items-center justify-center rounded-lg shrink-0 ${
                  isGraded ? 'bg-win-tint text-win' : 'bg-navy/15 text-navy'
                }`}
              >
                {isGraded ? <CheckCircle2 className="size-4" /> : <BookOpen className="size-4" />}
              </div>
              <div className="flex items-baseline gap-2 min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink truncate">
                  {assignmentTitle || problem.topic || 'დავალების დეტალები'}
                </h3>
                <span className="text-[11px] font-mono text-muted shrink-0">
                  / {isGraded ? 'შეფასებული' : 'ამოცანის პირობა'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-7 shrink-0 items-center justify-center bg-surface text-muted hover:bg-paper-deep hover:text-ink transition-colors cursor-pointer rounded-lg border border-hairline/80"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
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
          <div className="border-t border-hairline bg-surface px-5 py-3 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-1.5 text-xs font-bold text-ink bg-paper-deep hover:bg-surface border border-hairline transition-all active:scale-98 cursor-pointer"
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