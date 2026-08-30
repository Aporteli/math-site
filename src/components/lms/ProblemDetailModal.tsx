'use client';

import { useState, useRef } from 'react';
import { X, UploadCloud, CheckCircle2, RotateCcw, Send, Loader2, ImageIcon, ZoomIn } from 'lucide-react';
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
  onFile: (file: File) => Promise<void>;
  onRemoveFile: () => void;
  onMarkSubmitted: () => Promise<void>;
  onWithdraw: () => void;
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
  onFile,
  onRemoveFile,
  onMarkSubmitted,
  onWithdraw,
}: ProblemDetailModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSubmitted = problem.status === 'submitted' || problem.status === 'graded';
  const isGraded = problem.status === 'graded';

  const teacherImageRaw =
    (isImageString(problem.teacherAttachmentUrl) ? problem.teacherAttachmentUrl : null) ||
    (isImageString(problem.promptTex) ? problem.promptTex : null);

  const teacherImages = parseImageUrls(teacherImageRaw);
  const studentImages = parseImageUrls(problem.previewUrl);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onFile(file);
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    setSubmitting(true);
    try {
      await onMarkSubmitted();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}>
        <div
          className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}>
          {/* ჰედერი */}
          <div className="flex items-center justify-end border-b border-hairline bg-paper/30 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-xl border border-hairline bg-white text-muted hover:bg-paper hover:text-ink transition-colors">
              <X className="size-4" />
            </button>
          </div>

          {/* მოდალის შიგთავსი */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {/* 1. ამოცანის პირობა (სურათი + ფორმულა) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">ამოცანის პირობა</label>

              <div className="rounded-2xl border  border-slate-200 bg-slate-50/70 p-4 flex flex-col gap-3">
                {/* მასწავლებლის მიერ მიმაგრებული დაფა / სურათი (მუქი ფონით, რათა თეთრი ხაზები მკაფიოდ გამოჩნდეს) */}
                {teacherImages.length > 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-inner">
                    <span className="text-[10px] font-bold text-slate-400 self-start flex items-center gap-1.5 px-1">
                      <ImageIcon className="size-3 text-indigo-400" /> დაფის ჩანაწერი / სურათი
                    </span>
                    {teacherImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        onClick={() => setExpandedImage(imgUrl)}
                        className="group relative w-full flex items-center justify-center cursor-zoom-in overflow-hidden rounded-xl bg-slate-900/60 p-2 border border-slate-800/80">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt="ამოცანის სურათი"
                          className="max-h-72 w-auto max-w-full rounded-lg object-contain transition-transform group-hover:scale-[1.01]"
                        />
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md backdrop-blur-xs border border-slate-700">
                            <ZoomIn className="size-3.5" /> სრულად გახსნა
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ტექსტური / KaTeX ამოცანა */}
                {problem.promptTex && !isImageString(problem.promptTex) && (
                  <div className="rounded-2xl  bg-paper-deep p-4 space-y-3">
                    <div className="overflow-x-auto py-2">
                      <KatexPreview tex={problem.promptTex} className="text-sm text-ink leading-relaxed" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. მოსწავლის პასუხი / ნამუშევარი */}
            <div className="space-y-2">
              {studentImages.length > 0 ? (
                <div className="space-y-3">
                  {studentImages.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-2xl border border-hairline bg-white p-3 flex items-center gap-4 shadow-2xs">
                      <div
                        onClick={() => setExpandedImage(imgUrl)}
                        className="group relative size-20 shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt="ნამუშევარი"
                          className="size-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn className="size-4 text-white" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-ink truncate">
                          {problem.fileName && !problem.fileName.startsWith('[')
                            ? problem.fileName
                            : `ატვირთული ფაილი ${studentImages.length > 1 ? `#${idx + 1}` : ''}`}
                        </p>
                        <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" /> ფაილი მიმაგრებულია
                        </p>
                      </div>

                      {!isSubmitted && (
                        <button
                          type="button"
                          onClick={onRemoveFile}
                          className="flex size-8 items-center justify-center rounded-xl border border-hairline bg-white text-rose-600 hover:bg-rose-50 transition-colors">
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* 3. მასწავლებლის შეფასება */}
            {isGraded && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-1">
                <p className="text-xs font-bold text-emerald-800">მასწავლებლის შეფასება</p>
                {problem.grade !== undefined && (
                  <p className="text-lg font-bold text-emerald-900">ქულა: {problem.grade}</p>
                )}
                {problem.feedback && <p className="text-xs text-emerald-800/90">{problem.feedback}</p>}
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
            className="absolute right-5 top-5 flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25">
            <X className="size-6" />
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
