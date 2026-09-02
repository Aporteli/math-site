'use client';

import { KatexPreview } from '@/components/math/katex-preview';
import type { Assignment, AssignmentProblem } from '../types/student-assignment.types';
import { assignmentStatusMeta, extractFirstImageUrl } from '../helpers/student-assignment.helpers';

interface AssignmentTaskCardProps {
  assignment: Assignment;
  onSelectProblem: (payload: { assignmentId: string; problem: AssignmentProblem }) => void;
}

export function AssignmentTaskCard({ assignment, onSelectProblem }: AssignmentTaskCardProps) {
  const meta = assignmentStatusMeta(assignment);
  const teacherNote = assignment.instructions || assignment.note;
  const firstProblem = assignment.problems?.[0];
  const firstProblemTex = firstProblem?.promptTex;
  const customPayload = (assignment.customPayload as Record<string, unknown>) || {};

  const boardImageUrl =
    extractFirstImageUrl(assignment.attachmentUrl) ||
    extractFirstImageUrl(firstProblem?.teacherAttachmentUrl) ||
    (typeof customPayload.imageUrl === 'string' ? extractFirstImageUrl(customPayload.imageUrl) : null) ||
    (typeof customPayload.attachmentUrl === 'string' ? extractFirstImageUrl(customPayload.attachmentUrl) : null) ||
    extractFirstImageUrl(firstProblemTex);

  const isGraded = meta.id === 'graded';

  const handleClick = () => {
    if (!firstProblem) return;
    onSelectProblem({
      assignmentId: assignment.id,
      problem: {
        ...firstProblem,
        teacherAttachmentUrl: boardImageUrl || firstProblem.teacherAttachmentUrl,
      },
    });
  };

  return (
    <div
      onClick={handleClick}
      className={`flex flex-col justify-between rounded-2xl border p-3 transition-all cursor-pointer group min-h-[210px] ${
        isGraded
          ? 'border-emerald-200 bg-emerald-50/20 shadow-xs'
          : 'border-hairline bg-white hover:border-navy/40 hover:shadow-md'
      }`}>
      <div className="flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] ${meta.className}`}>
            <meta.icon className="size-3" />
            <span className="truncate">{meta.label}</span>
          </span>
        </div>

        {boardImageUrl ? (
          <div className="w-full h-32 rounded-xl border border-slate-800 bg-slate-950 p-1.5 flex items-center justify-center overflow-hidden shadow-inner">
            <img
              src={boardImageUrl}
              alt="დაფის ჩანაწერი"
              className="w-full h-full object-contain rounded bg-slate-900/60"
            />
          </div>
        ) : firstProblemTex ? (
          <div className="w-full h-32 rounded-xl bg-paper-deep p-3 flex items-center justify-center overflow-hidden">
            <KatexPreview
              tex={firstProblemTex}
              className="text-xs text-ink line-clamp-3 pointer-events-none leading-relaxed"
            />
          </div>
        ) : null}

        {teacherNote && teacherNote.trim() !== '' && teacherNote.trim() !== 'გთხოვთ ამოხსნათ მოცემული ამოცანა.' && (
          <div className="rounded-lg bg-amber-50/50 p-2 border border-amber-100/50">
            <p className="text-[11px] text-amber-900/70 line-clamp-2">
              <span className="font-bold text-amber-800/80 mr-1">შენიშვნა:</span>
              {teacherNote}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-hairline-soft">
        <span className="text-xs font-bold text-navy group-hover:underline flex items-center gap-1">
          ნახვა <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </div>
  );
}
