'use client';

import { ArrowUpRight } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import type { Assignment, AssignmentProblem } from '../types/student-assignment.types';
import { assignmentStatusMeta, extractImageUrls } from '../helpers/student-assignment.helpers';

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

  const imageSources = [
    assignment.attachmentUrl,
    firstProblem?.teacherAttachmentUrl,
    typeof customPayload.imageUrl === 'string' ? customPayload.imageUrl : null,
    typeof customPayload.attachmentUrl === 'string' ? customPayload.attachmentUrl : null,
    firstProblemTex,
  ];
  const fromServer = (firstProblem?.teacherImageUrls ?? []).filter((url) => url.length > 0);
  const imageUrls =
    fromServer.length > 0
      ? fromServer
      : imageSources.reduce<string[]>((best, source) => {
          const urls = extractImageUrls(source);
          return urls.length > best.length ? urls : best;
        }, []);

  const isGraded = meta.id === 'graded';
  const StatusIcon = meta.icon;

  const handleClick = () => {
    if (!firstProblem) return;
    onSelectProblem({
      assignmentId: assignment.id,
      problem: {
        ...firstProblem,
        teacherAttachmentUrl:
          imageUrls.length > 1
            ? JSON.stringify(imageUrls)
            : imageUrls[0] || firstProblem.teacherAttachmentUrl,
      },
    });
  };

  const showNote =
    Boolean(teacherNote && teacherNote.trim() !== '' && teacherNote.trim() !== 'გთხოვთ ამოხსნათ მოცემული ამოცანა.');

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group flex min-h-[260px] w-full cursor-pointer flex-col overflow-hidden rounded-box border border-hairline bg-surface text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/35"
    >
      <span className={`h-1 w-full shrink-0 ${isGraded ? 'bg-win' : 'bg-navy'}`} aria-hidden="true" />

      <div
        className={`relative mx-3 mt-3 overflow-hidden rounded-box border border-hairline bg-paper ${
          imageUrls.length > 1 ? 'max-h-52' : 'h-36'
        }`}
      >
        {imageUrls.length > 1 ? (
          <div className="grid max-h-52 grid-cols-2 gap-1 overflow-y-auto p-1">
            {imageUrls.map((url, index) => (
              <img key={`${url}-${index}`} src={url} alt="" className="h-24 w-full bg-white object-contain" />
            ))}
          </div>
        ) : imageUrls.length === 1 ? (
          <img src={imageUrls[0]} alt="" className="size-full bg-white object-contain p-2 transition duration-200 group-hover:scale-[1.03]" />
        ) : firstProblemTex ? (
          <div className="flex size-full items-center justify-center overflow-hidden px-3 py-2">
            <KatexPreview tex={firstProblemTex} className="pointer-events-none line-clamp-4 text-sm leading-relaxed text-ink" />
          </div>
        ) : (
          <div className="flex size-full items-center justify-center text-[11px] font-semibold text-muted">პრევიუ არ არის</div>
        )}

        <span
          className={`absolute left-2 top-2 mb-2 inline-flex items-center gap-1 rounded-box border px-2 py-0.5 text-[10px] font-bold shadow-sm ${
            isGraded ? 'border-win/20 bg-win-tint text-win' : 'border-navy/15 bg-surface text-navy'
          }`}
        >
          <StatusIcon className="size-3" />
          <span className="truncate">{meta.label}</span>
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 px-3.5 pb-3.5 pt-3">
        <div className="space-y-2">
          <p className="line-clamp-2 text-sm font-bold leading-snug text-ink">{assignment.title}</p>
          {showNote ? (
            <p className="line-clamp-2 rounded-box bg-brass-tint px-2 py-1.5 text-[11px] leading-snug text-ink">
              <span className="mr-1 font-bold text-brass-strong">შენიშვნა:</span>
              {teacherNote}
            </p>
          ) : null}
        </div>
        <span className="inline-flex w-fit items-center gap-1 rounded-box bg-navy-tint px-2.5 py-1 text-xs font-bold text-navy transition group-hover:bg-navy group-hover:text-white">
          ნახვა
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </button>
  );
}
