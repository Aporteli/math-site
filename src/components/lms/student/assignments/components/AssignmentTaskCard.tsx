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
      className={`group flex min-h-[210px] cursor-pointer flex-col justify-between rounded-2xl border p-3.5 transition-colors ${
        isGraded
          ? 'border-brass/35 bg-surface/90 hover:border-brass/55'
          : 'border-hairline bg-surface hover:border-brass/45 hover:bg-surface/85'
      }`}>
      <div className="flex min-w-0 flex-col gap-2.5">
        {/* სტატუსის ბეიჯი Lichess-ის ოქროსფერ/ნეიტრალურ ტონებში */}
        <div className="flex items-center justify-between gap-1.5">
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium border transition-colors ${
              isGraded
                ? 'border-brass/40 bg-brass-tint/60 text-brass'
                : 'border-hairline/50 bg-paper-deep/70 text-body group-hover:text-ink'
            }`}>
            <meta.icon className={`size-3 ${isGraded ? 'text-brass' : 'text-brass/80'}`} />
            <span className="truncate">{meta.label}</span>
          </span>
        </div>

        {/* სურათის ან ფორმულის პრევიუ */}
        {boardImageUrl ? (
          <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border-hairline bg-paper shadow-inner">
            <img src={boardImageUrl} alt="დაფის ჩანაწერი" className="h-full w-full rounded-lg object-contain" />
          </div>
        ) : firstProblemTex ? (
          <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border border-hairline/60 bg-paper-deep p-3 shadow-inner">
            <KatexPreview
              tex={firstProblemTex}
              className="line-clamp-3 pointer-events-none text-xs leading-relaxed text-ink"
            />
          </div>
        ) : null}

        {/* მასწავლებლის შენიშვნა Lichess-ის თბილ ბრინჯაოსფერ ბლოკში */}
        {teacherNote && teacherNote.trim() !== '' && teacherNote.trim() !== 'გთხოვთ ამოხსნათ მოცემული ამოცანა.' && (
          <div className="rounded-lg border border-brass/25 bg-brass-tint/60 p-2">
            <p className="line-clamp-2 text-[11px] leading-snug text-ink/85">
              <span className="mr-1 font-bold text-brass">შენიშვნა:</span>
              {teacherNote}
            </p>
          </div>
        )}
      </div>

      {/* ქვედა ზოლი */}
      <div className="flex items-center justify-between border-t border-hairline/60 pt-2.5">
        <span className="flex items-center gap-1 text-xs font-bold text-muted transition-colors group-hover:text-brass">
          ნახვა <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </div>
  );
}
