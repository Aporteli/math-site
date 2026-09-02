'use client';

import { FileText, Layers } from 'lucide-react';
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
        <div className="py-16 flex flex-col items-center justify-center text-center text-muted rounded-2xl border border-dashed border-hairline p-6 bg-paper/20">
          <Layers className="size-9 opacity-30 mb-2 text-indigo-500" />
          <p className="text-sm font-bold text-ink">სასწავლო მასალები არ არის</p>
          <p className="text-xs max-w-xs mt-1">ამ თარიღისთვის მასალები არ მოიძებნა.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {materialsForDate.map((mat) => {
            const firstProb = mat.problems?.[0];
            const promptText = firstProb?.promptTex || mat.instructions;

            // 🌟 სწორი ლინკის ამოღება (სტრიქონია თუ JSON მასივი)
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
                className="flex flex-col justify-between rounded-2xl border border-indigo-200 bg-indigo-50/20 p-3.5 transition-all cursor-pointer group hover:border-indigo-400 hover:shadow-md min-h-[210px]">
                <div className="flex flex-col gap-2 min-w-0">
                  <span className="rounded-lg bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px] font-bold self-start border border-indigo-200/60">
                    სასწავლო მასალა
                  </span>

                  {isImg && fileUrl ? (
                    <div className="w-full h-32 rounded-xl border border-slate-200 bg-slate-50 p-1 flex items-center justify-center overflow-hidden shadow-inner">
                      <img
                        src={fileUrl}
                        alt={mat.title}
                        className="w-full h-full object-contain rounded"
                        onError={(e) => {
                          // თუ სურათი ფიზიკურად არ იტვირთება, ავტომატურად დაიმალოს გატეხილი აიქონი
                          const target = e.target as HTMLElement;
                          target.style.display = 'none';
                          if (target.parentElement) {
                            target.parentElement.innerHTML =
                              '<div class="flex flex-col items-center justify-center text-indigo-600"><svg class="size-8 mb-1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span class="text-[10px] font-bold">ფაილის ნახვა</span></div>';
                          }
                        }}
                      />
                    </div>
                  ) : isFile ? (
                    <div className="w-full h-32 rounded-xl bg-white border border-indigo-100 p-3 flex flex-col items-center justify-center text-center shadow-2xs">
                      <FileText className="size-10 text-indigo-600 mb-1.5" />
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{mat.title}</p>
                      <span className="text-[10px] font-semibold text-indigo-600 mt-1">ფაილის გახსნა ↗</span>
                    </div>
                  ) : promptText ? (
                    <div className="w-full h-32 rounded-xl bg-paper-deep p-3 flex items-center justify-center overflow-hidden">
                      <KatexPreview
                        tex={promptText}
                        className="text-xs text-ink line-clamp-3 pointer-events-none leading-relaxed"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 rounded-xl bg-white border border-indigo-100 p-3 flex flex-col items-center justify-center text-center shadow-2xs">
                      <FileText className="size-10 text-indigo-600 mb-1.5" />
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{mat.title}</p>
                      <span className="text-[10px] font-semibold text-indigo-600 mt-1">ფაილის გახსნა ↗</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-indigo-100/70">
                  <span className="text-xs font-bold text-indigo-700 group-hover:underline flex items-center gap-1">
                    მასალის გახსნა <span className="transition-transform group-hover:translate-x-0.5">→</span>
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