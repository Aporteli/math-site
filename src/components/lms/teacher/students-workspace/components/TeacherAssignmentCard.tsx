'use client';

import { ArrowUpRight, CheckCircle2, FileText, Layers, Trash2 } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import { extractFirstImageUrl, isDocumentString, isMaterialItem } from '../helpers/teacher-workspace.helpers';
import type { StudentAssignment, ContentTab } from '../types/teacher-workspace.types';

interface TeacherAssignmentCardProps {
  assignment: StudentAssignment;
  activeTab: ContentTab;
  onSelect: () => void;
  onDelete: (id: string) => void;
}

export function TeacherAssignmentCard({ assignment, activeTab, onSelect, onDelete }: TeacherAssignmentCardProps) {
  const isGraded = assignment.status === 'GRADED' || assignment.status === 'RETURNED';
  const isSubmitted = assignment.status === 'SUBMITTED' || Boolean(assignment.studentAttachmentUrl);
  const isMaterial = isMaterialItem(assignment);

  const displayImageUrl =
    activeTab === 'answers' && assignment.studentAttachmentUrl
      ? extractFirstImageUrl(assignment.studentAttachmentUrl)
      : extractFirstImageUrl(assignment.problemImageUrl) || extractFirstImageUrl(assignment.promptTex);

  const isPdfOrDoc = Boolean(assignment.problemImageUrl) && isDocumentString(assignment.problemImageUrl);

  const accent = isMaterial ? 'bg-brass' : isGraded ? 'bg-win' : isSubmitted ? 'bg-navy' : 'bg-hairline';

  return (
    <div className="group relative flex min-h-[260px] w-full flex-col overflow-hidden rounded-2xl border border-hairline bg-surface text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-md">
      <button
        type="button"
        onClick={onSelect}
        className="flex min-h-[260px] w-full cursor-pointer flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/35"
      >
      <span className={`h-1 w-full shrink-0 ${accent}`} aria-hidden="true" />

      <div className="relative mx-3 mt-3 h-36 overflow-hidden rounded-xl border border-hairline bg-paper">
        {displayImageUrl ? (
          <img
            src={displayImageUrl}
            alt=""
            className="size-full bg-white object-contain p-2 transition duration-200 group-hover:scale-[1.03]"
          />
        ) : isPdfOrDoc ? (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 px-3 text-center">
            <FileText className="size-8 text-navy" />
            <span className="text-[11px] font-semibold text-navy">ფაილი</span>
          </div>
        ) : assignment.promptTex ? (
          <div className="flex size-full items-center justify-center overflow-hidden px-3 py-2">
            <KatexPreview
              tex={assignment.promptTex}
              className="pointer-events-none line-clamp-4 text-sm leading-relaxed text-ink"
            />
          </div>
        ) : isMaterial ? (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 bg-brass-tint px-3 text-center">
            <Layers className="size-8 text-brass-strong" />
            <span className="text-[11px] font-semibold text-brass-strong">სასწავლო მასალა</span>
          </div>
        ) : (
          <div className="flex size-full items-center justify-center text-[11px] font-semibold text-muted">
            პრევიუ არ არის
          </div>
        )}

        {isGraded ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-win/20 bg-win-tint px-2 py-0.5 text-[10px] font-bold text-win shadow-sm">
            <CheckCircle2 className="size-3" />
            ჩაბარებულია
          </span>
        ) : isSubmitted ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full border border-navy/15 bg-surface px-2 py-0.5 text-[10px] font-bold text-navy shadow-sm">
            <span className="size-1.5 rounded-full bg-navy" />
            პასუხი მიღებულია
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 px-3.5 pb-3.5 pt-3">
        <p className="line-clamp-2 text-sm font-bold leading-snug text-ink">{assignment.title}</p>
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-navy-tint px-2.5 py-1 text-xs font-bold text-navy transition group-hover:bg-navy group-hover:text-white">
          {isMaterial ? 'მასალის გახსნა' : 'ნახვა'}
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
      </button>

      <button
        type="button"
        title="წაშლა"
        onClick={() => onDelete(assignment.id)}
        className="absolute bottom-3.5 right-3.5 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full border border-hairline bg-surface text-muted shadow-sm transition hover:border-loss/40 hover:bg-loss-tint hover:text-loss"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
