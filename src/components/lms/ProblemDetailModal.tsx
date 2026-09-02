'use client';

import { useState } from 'react';
import { X, ImageIcon, ZoomIn, BookOpen } from 'lucide-react';
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

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}>
        <div
          className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-hairline/50 bg-paper shadow-2xl animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}>
          
          {/* ჰედერი Lichess-ის ზედაპირით */}
          <div className="flex items-center justify-between border-b border-hairline/40 bg-surface px-6 py-4">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-paper-deep text-brass border border-hairline/60 shrink-0">
                <BookOpen className="size-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-ink truncate leading-snug">
                  {assignmentTitle || problem.topic || 'დავალების დეტალები'}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-hairline/60 bg-paper-deep text-muted hover:bg-surface hover:text-ink transition-colors">
              <X className="size-4" />
            </button>
          </div>

          {/* მოდალის შიგთავსი */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">
                ამოცანის პირობა
              </label>

              <div className="rounded-2xl border border-hairline/50 bg-surface/30 p-4 flex flex-col gap-3">
                {teacherImages.length > 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-black/40 bg-black/50 p-3 shadow-inner">
                    <span className="text-[10px] font-semibold text-brass self-start flex items-center gap-1.5 px-1">
                      <ImageIcon className="size-3 text-brass" /> დაფის ჩანაწერი / სურათი
                    </span>
                    {teacherImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        onClick={() => setExpandedImage(imgUrl)}
                        className="group relative w-full flex items-center justify-center cursor-zoom-in overflow-hidden rounded-xl bg-black/40 p-2 border border-hairline/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt="ამოცანის სურათი"
                          className="max-h-80 w-auto max-w-full rounded-lg object-contain transition-transform group-hover:scale-[1.01]"
                        />
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-paper px-3.5 py-1.5 text-xs font-bold text-ink shadow-md backdrop-blur-xs border border-hairline">
                            <ZoomIn className="size-3.5 text-brass" /> სრულად გახსნა
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {problem.promptTex && !isImageString(problem.promptTex) && (
                  <div className="rounded-xl border border-hairline/40 bg-paper-deep/70 p-4">
                    <div className="overflow-x-auto py-1">
                      <KatexPreview tex={problem.promptTex} className="text-sm text-ink leading-relaxed" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* მასწავლებლის შეფასება (თუ შეფასებულია) Lichess-ის ოქროსფერ ბლოკში */}
            {isGraded && (
              <div className="rounded-2xl border border-brass/30 bg-brass-tint/60 p-4 space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wider text-brass">მასწავლებლის შეფასება</p>
                {problem.grade !== undefined && (
                  <p className="text-lg font-bold text-ink">ქულა: <span className="text-brass">{problem.grade}</span></p>
                )}
                {problem.feedback && <p className="text-xs leading-relaxed text-ink/80">{problem.feedback}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox - სურათის სრულეკრანიანი გადიდება */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-150 cursor-zoom-out"
          onClick={() => setExpandedImage(null)}>
          <button
            type="button"
            onClick={() => setExpandedImage(null)}
            className="absolute right-5 top-5 flex size-10 items-center justify-center rounded-full bg-paper-deep/80 text-ink border border-hairline/60 backdrop-blur-sm transition-colors hover:text-brass">
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expandedImage}
            alt="გადიდებული სურათი"
            className="max-h-[92vh] max-w-[94vw] rounded-2xl object-contain shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}