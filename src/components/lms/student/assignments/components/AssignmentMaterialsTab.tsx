'use client';

import { ArrowUpRight, FileText, Layers } from 'lucide-react';
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
    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-paper p-3 pe-2 sm:p-4">
      {materialsForDate.length === 0 ? (
        <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-surface px-6 py-16 text-center">
          <span className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl border border-hairline bg-brass-tint text-brass-strong">
            <Layers className="size-5" />
          </span>
          <p className="text-sm font-bold text-ink">სასწავლო მასალები არ არის</p>
          <p className="mt-1 max-w-xs text-xs text-muted">ამ თარიღისთვის მასალები არ მოიძებნა.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {materialsForDate.map((material) => {
            const firstProblem = material.problems?.[0];
            const promptText = firstProblem?.promptTex || material.instructions;

            const rawFileUrl =
              material.attachmentUrl ||
              material.problemImageUrl ||
              firstProblem?.teacherAttachmentUrl ||
              (typeof material.customPayload?.imageUrl === 'string' ? material.customPayload.imageUrl : null) ||
              (typeof material.customPayload?.attachmentUrl === 'string' ? material.customPayload.attachmentUrl : null);

            const fileUrl =
              extractFirstImageUrl(rawFileUrl) || (typeof rawFileUrl === 'string' ? rawFileUrl.trim() : null);
            const isImg = isImageString(fileUrl);
            const isFile = Boolean(fileUrl) && !isImg;

            return (
              <button
                key={material.id}
                type="button"
                onClick={() => {
                  if (fileUrl) {
                    setPreviewMaterialModal({
                      url: fileUrl,
                      title: material.title,
                      isAnswer: false,
                      instructions: material.instructions,
                    });
                  } else if (firstProblem && firstProblem.promptTex) {
                    setActiveProblemModal({
                      assignmentId: material.id,
                      problem: firstProblem,
                    });
                  }
                }}
                className="group flex min-h-[260px] w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-hairline bg-surface text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/35"
              >
                <span className="h-1 w-full shrink-0 bg-brass" aria-hidden="true" />

                <div className="relative mx-3 mt-3 h-36 overflow-hidden rounded-xl border border-hairline bg-paper">
                  {isImg && fileUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={fileUrl}
                      alt=""
                      className="size-full bg-white object-contain p-2 transition duration-200 group-hover:scale-[1.03]"
                    />
                  ) : isFile ? (
                    <div className="flex size-full flex-col items-center justify-center gap-1.5 px-3 text-center">
                      <FileText className="size-8 text-navy" />
                      <span className="text-[11px] font-semibold text-navy">ფაილი</span>
                    </div>
                  ) : promptText ? (
                    <div className="flex size-full items-center justify-center overflow-hidden px-3 py-2">
                      <KatexPreview
                        tex={promptText}
                        className="pointer-events-none line-clamp-4 text-sm leading-relaxed text-ink"
                      />
                    </div>
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-1.5 bg-brass-tint px-3 text-center">
                      <Layers className="size-8 text-brass-strong" />
                      <span className="text-[11px] font-semibold text-brass-strong">სასწავლო მასალა</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between gap-3 px-3.5 pb-3.5 pt-3">
                  <p className="line-clamp-2 text-sm font-bold leading-snug text-ink">{material.title}</p>
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-navy-tint px-2.5 py-1 text-xs font-bold text-navy transition group-hover:bg-navy group-hover:text-white">
                    მასალის გახსნა
                    <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
