'use client';

import { useRef, useState } from 'react';
import { X, UploadCloud, Paperclip, CheckCircle2, RotateCcw, GraduationCap, Trash2, Send, PenTool, ZoomIn } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import { StudentWhiteboard } from '@/components/lms/StudentWhiteboard';

type Difficulty = 'easy' | 'medium' | 'hard' | 'olympiad';
type ProblemStatus = 'notStarted' | 'uploaded' | 'submitted' | 'graded';

type AssignmentProblem = {
  id: string;
  promptTex: string;
  topic: string;
  difficulty: Difficulty;
  status: ProblemStatus;
  fileName?: string;
  previewUrl?: string;
  grade?: number;
  feedback?: string;
  teacherAttachmentUrl?: string | null;
};

interface ProblemDetailModalProps {
  problem: AssignmentProblem;
  assignmentTitle: string;
  onClose: () => void;
  onFile: (file: File) => void;
  onRemoveFile: () => void;
  onMarkSubmitted: () => void;
  onWithdraw: () => void;
}

const DIFFICULTY_TONE: Record<Difficulty, string> = {
  easy: 'bg-navy-tint text-navy',
  medium: 'bg-brass-tint text-brass-strong',
  hard: 'bg-navy text-white',
  olympiad: 'border border-brass/40 bg-white text-brass-strong',
};

function gradeTone(score: number) {
  return score >= 85 ? 'bg-navy-tint text-navy' : 'bg-brass-tint text-brass-strong';
}

export function ProblemDetailModal({
  problem,
  assignmentTitle,
  onClose,
  onFile,
  onRemoveFile,
  onMarkSubmitted,
  onWithdraw,
}: ProblemDetailModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [inputMethod, setInputMethod] = useState<'upload' | 'draw'>('upload');
  
  // სრულეკრანიანი სურათის სტეიტი
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const isImage = problem.previewUrl
    ? problem.previewUrl.startsWith('data:image/') || /\.(png|jpe?g|webp)$/i.test(problem.fileName || '')
    : false;

  const teacherImgSrc = (() => {
    const attUrl = problem.teacherAttachmentUrl || problem.previewUrl || problem.fileName;
    if (!attUrl) return '';
    if (attUrl.startsWith('data:') || attUrl.startsWith('http') || attUrl.startsWith('/')) {
      return attUrl;
    }
    return `data:image/png;base64,${attUrl}`;
  })();

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}>
        <div
          className="flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl transition-all"
          onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
            <div>
              <h3 className="text-lg font-bold text-ink">{assignmentTitle}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${DIFFICULTY_TONE[problem.difficulty]}`}>
                  {problem.difficulty}
                </span>
                <span className="text-xs font-medium text-muted">{problem.topic}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink transition-colors">
              <X className="size-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="rounded-2xl bg-paper-deep px-5 py-5 border border-hairline-soft">
              <KatexPreview
                tex={problem.promptTex}
                className="block text-ink text-sm sm:text-base leading-relaxed [&_.katex]:text-[1.05rem]"
              />
            </div>

            {/* მასწავლებლის მიმაგრებული ფოტო (კლიკზე გადიდებადი) */}
            {teacherImgSrc && (
              <div className="rounded-2xl border border-hairline bg-paper p-4 space-y-2">
                <p className="text-xs font-bold text-muted uppercase">მასწავლებლის მიმაგრებული ფოტო (დააჭირეთ გასადიდებლად):</p>
                <div 
                  onClick={() => setIsFullscreen(true)}
                  className="group relative overflow-hidden rounded-xl border border-hairline bg-white flex justify-center p-2 cursor-zoom-in"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={teacherImgSrc} 
                    alt="Teacher attachment" 
                    className="max-h-64 w-auto rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.02]" 
                  />
                  <div className="absolute inset-0 bg-slate-900/0 transition-all group-hover:bg-slate-900/10 flex items-center justify-center pointer-events-none">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-ink text-xs font-bold px-3 py-1.5 rounded-xl shadow-md backdrop-blur-sm">
                      გადიდება
                    </span>
                  </div>
                </div>
              </div>
            )}

            {problem.status === 'graded' && (
              <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="size-5 text-emerald-700" />
                    <span className="text-sm font-bold text-emerald-900">მასწავლებლის შეფასება</span>
                  </div>
                  {typeof problem.grade === 'number' && (
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${gradeTone(problem.grade)}`}>
                      {problem.grade} / 10
                    </span>
                  )}
                </div>
                {problem.feedback && (
                  <p className="text-sm font-medium text-emerald-800 leading-relaxed">{problem.feedback}</p>
                )}
              </div>
            )}

            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-ink">თქვენი ნამუშევარი</h4>

                {problem.status === 'notStarted' && (
                  <div className="flex items-center rounded-xl bg-paper p-1 border border-hairline-soft">
                    <button
                      type="button"
                      onClick={() => setInputMethod('upload')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                        inputMethod === 'upload' ? 'bg-white text-navy shadow-xs' : 'text-muted hover:text-ink'
                      }`}>
                      <UploadCloud className="size-3.5" /> ფაილი
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMethod('draw')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                        inputMethod === 'draw' ? 'bg-white text-navy shadow-xs' : 'text-muted hover:text-ink'
                      }`}>
                      <PenTool className="size-3.5" /> დაფა
                    </button>
                  </div>
                )}
              </div>

              {problem.status === 'notStarted' && (
                <>
                  {inputMethod === 'upload' ? (
                    <div className="relative animate-in fade-in zoom-in-95 duration-200">
                      <input
                        ref={inputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,application/pdf"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onFile(file);
                          e.target.value = '';
                        }}
                      />
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => inputRef.current?.click()}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          setDragActive(true);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'copy';
                          setDragActive(true);
                        }}
                        onDragLeave={(e) => {
                          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                          setDragActive(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragActive(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) onFile(file);
                        }}
                        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                          dragActive
                            ? 'border-navy bg-navy-tint/60'
                            : 'border-hairline bg-paper hover:border-navy/40 hover:bg-paper-deep'
                        }`}>
                        <span className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-xs text-navy">
                          <UploadCloud className="size-6" />
                        </span>
                        <div>
                          <p className="text-[15px] font-bold text-ink">ატვირთეთ ფაილი</p>
                          <p className="mt-1 text-xs font-medium text-muted">ან ჩააგდეთ აქ. PDF, JPG, PNG ფორმატები</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                      <StudentWhiteboard
                        problemId={problem.id}
                        onSave={(file) => {
                          onFile(file);
                          setInputMethod('upload');
                        }}
                        onCancel={() => setInputMethod('upload')}
                      />
                    </div>
                  )}
                </>
              )}

              {problem.status === 'uploaded' && (
                <div className="flex items-center gap-4 rounded-2xl border border-hairline bg-paper p-4">
                  {isImage && problem.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={problem.previewUrl}
                      alt="Preview"
                      className="size-16 rounded-xl border border-hairline object-contain bg-white shadow-2xs"
                    />
                  ) : (
                    <span className="flex size-14 items-center justify-center rounded-xl bg-white text-navy shadow-xs">
                      <Paperclip className="size-6" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{problem.fileName || 'ამოხსნა (დაფიდან)'}</p>
                    <p className="text-xs font-medium text-muted">ფაილი მზადაა გასაგზავნად</p>
                  </div>
                  <button
                    type="button"
                    className="flex size-9 items-center justify-center rounded-xl bg-white text-rose-600 shadow-xs hover:bg-rose-50 transition-colors"
                    onClick={onRemoveFile}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}

              {problem.status === 'submitted' && (
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-navy/20 bg-navy-tint/40 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-navy text-white shadow-xs">
                      <CheckCircle2 className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-navy">დავალება ჩაბარებულია</p>
                      {problem.fileName && (
                        <p className="truncate text-xs font-medium text-navy/70">{problem.fileName}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-navy shadow-xs hover:bg-navy-tint transition-colors"
                    onClick={onWithdraw}>
                    <RotateCcw className="size-3.5" />
                    დაბრუნება
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-hairline bg-paper/50 px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-ink shadow-xs border border-hairline hover:bg-paper transition-colors">
              დახურვა
            </button>

            {problem.status === 'uploaded' && (
              <button
                type="button"
                onClick={onMarkSubmitted}
                className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-navy-strong transition-colors">
                <Send className="size-4" />
                გაგზავნა მასწავლებელთან
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Modal / Lightbox */}
      {isFullscreen && teacherImgSrc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setIsFullscreen(false)}
        >
          <div className="relative flex h-full w-full items-center justify-center">
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-rose-500 transition-colors"
            >
              <X className="size-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={teacherImgSrc}
              alt="გადიდებული ფოტო"
              className="max-h-[95vh] max-w-[95vw] rounded-xl object-contain shadow-2xl cursor-default"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}