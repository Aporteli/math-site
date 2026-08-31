'use client';

import { useState } from 'react';
import { X, ImageIcon, ZoomIn, UploadCloud, BookOpen, CheckCircle2 } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';

const DEFAULT_JUNK_TEXT = '';

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

export function TeacherViewProblemModal({
  assignment,
  studentName,
  mode = 'task',
  onClose,
}: {
  assignment: any;
  studentName: string;
  mode?: 'task' | 'answer';
  onClose: () => void;
}) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const rawPrompt =
    assignment.promptTex === DEFAULT_JUNK_TEXT || assignment.promptTex === 'პირობა არ მოიძებნა'
      ? ''
      : assignment.promptTex;

  const rawInstructions =
    assignment.instructions === DEFAULT_JUNK_TEXT ? '' : assignment.instructions;

  // 1. მასწავლებლის ამოცანის სურათები
  const payload = assignment.customPayload || {};
  const problemImageRaw =
    (isImageString(assignment.problemImageUrl) ? assignment.problemImageUrl : null) ||
    (isImageString(assignment.attachmentUrl) ? assignment.attachmentUrl : null) ||
    (isImageString(payload.imageUrl) ? payload.imageUrl : null) ||
    (isImageString(payload.attachmentUrl) ? payload.attachmentUrl : null) ||
    (isImageString(payload.promptTex) ? payload.promptTex : null) ||
    (isImageString(rawPrompt) ? rawPrompt : null);

  const problemImages = parseImageUrls(problemImageRaw);

  // 2. მოსწავლის გამოგზავნილი პასუხის სურათები
  const studentImages = parseImageUrls(assignment.studentAttachmentUrl);

  const hasTextPrompt = Boolean(rawPrompt && !isImageString(rawPrompt) && rawPrompt.trim() !== '');

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}>
        <div
          className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}>
          
          {/* ჰედერი — მარცხნივ აიკონით და მოსწავლის სახელით */}
          <div className="flex items-center justify-between border-b border-hairline bg-paper/30 px-6 py-4">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div
                className={`flex size-8 items-center justify-center rounded-xl shrink-0 ${
                  mode === 'answer' ? 'bg-emerald-50 text-emerald-600' : 'bg-navy/10 text-navy'
                }`}>
                {mode === 'answer' ? <CheckCircle2 className="size-4.5" /> : <BookOpen className="size-4.5" />}
              </div>
              <h3 className="text-base font-bold text-ink truncate">
                {studentName} {mode === 'answer' ? '— მოსწავლის პასუხი' : '— ამოცანის პირობა'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-hairline bg-white text-muted hover:bg-paper hover:text-ink transition-colors">
              <X className="size-4" />
            </button>
          </div>

          {/* შიგთავსი */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            
            {/* 🌟 თუ პასუხის რეჟიმში ვართ: ვაჩვენებთ მოსწავლის ნამუშევარს 🌟 */}
            {mode === 'answer' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted">მოსწავლის ნამუშევარი</label>

                {studentImages.length > 0 ? (
                  <div className="space-y-3">
                    {studentImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        onClick={() => setExpandedImage(imgUrl)}
                        className="group relative flex flex-col items-center justify-center rounded-2xl border border-blue-200 bg-blue-50/30 p-3 cursor-zoom-in hover:border-blue-400 transition-all shadow-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt={`მოსწავლის პასუხი ${idx + 1}`}
                          className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain bg-white border border-slate-200 transition-transform group-hover:scale-[1.01]"
                        />
                        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xs">
                            <ZoomIn className="size-3.5" /> სრულად გახსნა {studentImages.length > 1 ? `#${idx + 1}` : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-hairline bg-paper/20 p-8 text-center">
                    <UploadCloud className="size-8 text-muted/40 mx-auto mb-2" />
                    <p className="text-xs font-bold text-ink">პასუხი არ მოიძებნა</p>
                  </div>
                )}
              </div>
            ) : (
              /* 🌟 თუ ამოცანის რეჟიმში ვართ: ვაჩვენებთ დაფას/პირობას 🌟 */
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted">ამოცანის პირობა</label>
                
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  {hasTextPrompt && (
                    <div className="rounded-xl bg-paper-deep p-4 overflow-x-auto shadow-2xs">
                      <KatexPreview tex={rawPrompt} className="text-sm text-ink leading-relaxed" />
                    </div>
                  )}

                  {problemImages.length > 0 && (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-inner">
                      <span className="text-[10px] font-bold text-slate-400 self-start flex items-center gap-1.5 px-1">
                        <ImageIcon className="size-3 text-indigo-400" /> დაფის ჩანაწერი / სურათი
                      </span>
                      {problemImages.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          onClick={() => setExpandedImage(imgUrl)}
                          className="group relative w-full flex items-center justify-center cursor-zoom-in overflow-hidden rounded-xl bg-slate-900/60 p-2 border border-slate-800/80">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgUrl}
                            alt="ამოცანის სურათი"
                            className="max-h-80 w-auto max-w-full rounded-lg object-contain transition-transform group-hover:scale-[1.01]"
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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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