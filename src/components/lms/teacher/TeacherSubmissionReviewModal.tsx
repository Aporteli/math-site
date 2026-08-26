'use client';

import { useState, useEffect } from 'react';
import {
  X,
  GraduationCap,
  Paperclip,
  CheckCircle2,
  FileText,
  Download,
  Loader2,
  User,
  AlertCircle,
  Maximize2,
} from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import { gradeSubmissionAction } from '@/lib/actions/teacher-homework';

interface TeacherSubmissionReviewModalProps {
  submission: {
    id: string;
    status: string;
    attachmentUrl?: string | null;
    grade?: { score: number; comment?: string | null } | null;
    assignment: {
      title: string;
      promptTex: string;
      topic?: string;
      difficulty?: string;
      courseTitle: string;
    };
  };
  studentName: string;
  onClose: () => void;
  onGraded: (score: number, comment?: string) => void;
}

export function TeacherSubmissionReviewModal({
  submission,
  studentName,
  onClose,
  onGraded,
}: TeacherSubmissionReviewModalProps) {
  const [scoreInput, setScoreInput] = useState<number | ''>(submission.grade?.score ?? '');
  const [commentInput, setCommentInput] = useState<string>(submission.grade?.comment ?? '');
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const rawAttachment = submission.attachmentUrl?.trim();

  const attachment = rawAttachment
    ? rawAttachment.startsWith('data:') || rawAttachment.startsWith('http') || rawAttachment.startsWith('/')
      ? rawAttachment
      : `data:image/png;base64,${rawAttachment}`
    : null;

  const isPdf = attachment ? attachment.startsWith('data:application/pdf') || /\.pdf$/i.test(attachment) : false;
  const isImage = Boolean(attachment && !isPdf);

  // Esc ღილაკზე გადიდებული სურათის დახურვა
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  async function handleSaveGrade() {
    if (scoreInput === '' || Number(scoreInput) < 0 || Number(scoreInput) > 100) return;

    setSaving(true);
    const res = await gradeSubmissionAction({
      submissionId: submission.id,
      score: Number(scoreInput),
      comment: commentInput.trim() || undefined,
    });
    setSaving(false);

    if (res.success) {
      onGraded(Number(scoreInput), commentInput.trim() || undefined);
      onClose();
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}>
        <div
          className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-navy-tint text-navy">
                <User className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">
                  {studentName} — {submission.assignment.title}
                </h3>
                <p className="text-xs text-muted">
                  {submission.assignment.courseTitle}
                  {submission.assignment.topic ? ` · ${submission.assignment.topic}` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink transition-colors">
              <X className="size-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto p-6">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">ამოცანის პირობა</h4>
              <div className="rounded-2xl border border-hairline-soft bg-paper/60 p-5 overflow-x-auto">
                <KatexPreview
                  tex={submission.assignment.promptTex}
                  displayMode
                  className="text-ink text-sm sm:text-base leading-relaxed"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">მოსწავლის ამოხსნა</h4>

              {!attachment ? (
                <div className="flex h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-hairline bg-paper/30 text-center text-muted">
                  <Paperclip className="size-8 opacity-40 mb-2" />
                  <p className="text-xs font-medium">ფაილი ჯერ არ არის ატვირთული</p>
                </div>
              ) : isImage && !imageError ? (
                <div
                  className="group relative overflow-hidden rounded-2xl border border-hairline bg-paper p-2 flex flex-col items-center justify-center min-h-[260px] cursor-zoom-in"
                  onClick={() => setIsFullscreen(true)}>
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/0 transition-all group-hover:bg-slate-900/5">
                    <div className="flex items-center gap-2 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-bold text-ink shadow-sm opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-sm border border-white/50">
                      <Maximize2 className="size-3.5" /> სრულ ეკრანზე ნახვა
                    </div>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachment}
                    alt="ამოხსნის სურათი"
                    onError={() => setImageError(true)}
                    className="max-h-[380px] w-full rounded-xl object-contain bg-white shadow-inner transition-transform duration-300 group-hover:scale-[1.01]"
                  />
                </div>
              ) : isPdf ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-hairline bg-paper p-6 text-center">
                  <FileText className="size-12 text-navy" />
                  <p className="text-xs font-bold text-ink">PDF დოკუმენტი</p>
                  <a
                    href={attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-navy-strong transition-colors">
                    <Download className="size-3.5" /> PDF-ის გახსნა / გადმოწერა
                  </a>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/50 p-6 text-center">
                  <AlertCircle className="size-8 text-rose-500" />
                  <p className="text-xs font-bold text-rose-800">ფაილი დაზიანებულია ან ვერ გაიხსნა</p>
                  <a
                    href={attachment}
                    download="solution.png"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-ink border border-hairline shadow-xs hover:bg-paper">
                    <Download className="size-3.5" /> ორიგინალის ჩამოტვირთვა
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-hairline bg-paper/40 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[280px]">
                <div className="flex items-center gap-2">
                  <GraduationCap className="size-4 text-navy" />
                  <span className="text-xs font-bold text-ink">ქულა (0-10):</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={scoreInput}
                    onChange={(e) => setScoreInput(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="10"
                    className="w-16 rounded-xl border border-hairline bg-white px-2.5 py-1.5 text-center text-sm font-bold text-ink outline-none focus:border-navy"
                  />
                </div>

                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="კომენტარი / უკუკავშირი მოსწავლისთვის..."
                  className="flex-1 min-w-[200px] rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs text-ink outline-none focus:border-navy"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-ink border border-hairline hover:bg-paper transition-colors">
                  დახურვა
                </button>
                <button
                  type="button"
                  disabled={saving || scoreInput === ''}
                  onClick={handleSaveGrade}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-5 py-2 text-xs font-bold text-white hover:bg-navy-strong disabled:opacity-50 transition-colors">
                  {saving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>ინახება...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5" />
                      <span>შეფასების შენახვა</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* გადიდებული სურათის მოდალი (Fullscreen) */}
      {isFullscreen && isImage && attachment && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 cursor-zoom-out"
          onClick={() => setIsFullscreen(false)}>
          <div className="relative flex h-full w-full items-center justify-center">
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-rose-500 hover:text-white transition-colors">
              <X className="size-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment}
              alt="გადიდებული ამოხსნა"
              className="max-h-[95vh] max-w-[95vw] rounded-lg object-contain cursor-default shadow-2xl"
              onClick={(e) => e.stopPropagation()} // სურათზე დაჭერით არ დაიხურება
            />
          </div>
        </div>
      )}
    </>
  );
}
