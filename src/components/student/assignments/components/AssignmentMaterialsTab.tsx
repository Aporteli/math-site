'use client';

import { FileText, Layers, ArrowRight } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import type { Assignment, AssignmentProblem } from '../types/student-assignment.types';
import { extractFirstImageUrl, isImageString } from '../helpers/student-assignment.helpers';

interface AssignmentMaterialsTabProps {
  materialsForDate: Assignment[];
  setPreviewMaterialModal: (modal: {
    url: string;
    title: string;
    isAnswer?: boolean;
    instructions?: string | null;
  }) => void;
  setActiveProblemModal: (modal: {
    assignmentId: string;
    problem: AssignmentProblem;
  }) => void;
}

export function AssignmentMaterialsTab({
  materialsForDate,
  setPreviewMaterialModal,
  setActiveProblemModal,
}: AssignmentMaterialsTabProps) {
  return (
    <div className="flex-1 overflow-y-auto pt-1 pe-1 custom-scrollbar">
      {materialsForDate.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center text-muted rounded-2xl border border-dashed border-hairline/50 p-6 bg-surface/20">
          <Layers className="size-8 opacity-40 mb-2 text-brass" />
          <p className="text-sm font-bold text-ink">სასწავლო მასალები არ არის</p>
          <p className="text-xs max-w-xs mt-1 text-muted">ამ თარიღისთვის მასალები არ მოიძებნა.</p>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {materialsForDate.map((mat) => {
            const firstProb = mat.problems?.[0];
            const promptText = firstProb?.promptTex || mat.instructions;

            const rawFileUrl =
              mat.attachmentUrl ||
              mat.problemImageUrl ||
              firstProb?.teacherAttachmentUrl ||
              (typeof mat.customPayload?.imageUrl === 'string' ? mat.customPayload.imageUrl : null) ||
              (typeof mat.customPayload?.attachmentUrl === 'string' ? mat.customPayload.attachmentUrl : null);

            const fileUrl =
              extractFirstImageUrl(rawFileUrl) || (typeof rawFileUrl === 'string' ? rawFileUrl.trim() : null);
            const isImg = isImageString(fileUrl);
            const isFile = Boolean(fileUrl) && !isImg;

            return (
              <div
                key={mat.id}
                onClick={() => {
                  if (fileUrl) {
                    setPreviewMaterialModal({
                      url: fileUrl,
                      title: mat.title,
                      isAnswer: false,
                      instructions: mat.instructions,
                    });
                  } else if (firstProb && firstProb.promptTex) {
                    setActiveProblemModal({
                      assignmentId: mat.id,
                      problem: firstProb,
                    });
                  }
                }}
                className="flex flex-col justify-between rounded-2xl border border-hairline/40 bg-surface/30 p-3.5 transition-all cursor-pointer group hover:border-hairline hover:bg-surface/50 min-h-[220px]">
                <div className="flex flex-col gap-3 min-w-0">
                  {/* ზედა მომრგვალებული ბეიჯი Lichess-ის სტილში */}
                  <div className="flex items-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-deep/70 px-2.5 py-0.5 text-[10px] font-medium text-body border border-hairline/50">
                      <Layers className="size-3 text-brass" />
                      <span>სასწავლო მასალა</span>
                    </span>
                  </div>

                  {isImg && fileUrl ? (
                    <div className="w-full h-32 rounded-xl bg-paper flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={fileUrl}
                        alt={mat.title}
                        className="w-full h-full object-contain rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLElement;
                          target.style.display = 'none';
                          if (target.parentElement) {
                            target.parentElement.innerHTML =
                              '<div class="flex flex-col items-center justify-center text-brass"><svg class="size-8 mb-1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span class="text-[10px] font-bold">ფაილის ნახვა</span></div>';
                          }
                        }}
                      />
                    </div>
                  ) : isFile ? (
                    <div className="w-full h-32 rounded-xl bg-paper-deep/80 border border-hairline/60 p-3 flex flex-col items-center justify-center text-center shadow-inner group-hover:border-brass/40 transition-colors">
                      <FileText className="size-9 text-brass mb-1.5 opacity-90" />
                      <p className="text-xs font-bold text-ink line-clamp-1">{mat.title}</p>
                      <span className="text-[10px] font-medium text-brass/80 mt-1">ფაილის გახსნა ↗</span>
                    </div>
                  ) : promptText ? (
                    <div className="w-full h-32 rounded-xl bg-paper-deep/80 border border-hairline/60 p-3 flex items-center justify-center overflow-hidden shadow-inner">
                      <KatexPreview
                        tex={promptText}
                        className="text-xs text-ink line-clamp-3 pointer-events-none leading-relaxed"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 rounded-xl bg-paper-deep/80 border border-hairline/60 p-3 flex flex-col items-center justify-center text-center shadow-inner group-hover:border-brass/40 transition-colors">
                      <FileText className="size-9 text-brass mb-1.5 opacity-90" />
                      <p className="text-xs font-bold text-ink line-clamp-1">{mat.title}</p>
                      <span className="text-[10px] font-medium text-brass/80 mt-1">ფაილის გახსნა ↗</span>
                    </div>
                  )}
                </div>

                {/* ქვედა ზოლი: ხაზის გარეშე, სუფთა ტექსტური ისრით */}
                <div className="pt-2">
                  <span className="text-xs font-semibold text-body group-hover:text-ink flex items-center gap-1 transition-colors">
                    <span>მასალის გახსნა</span>
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}