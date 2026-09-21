'use client';

import { CheckCircle2, FileText, Layers, Trash2 } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import {
  extractFirstImageUrl,
  isDocumentString,
  isMaterialItem,
} from '../helpers/teacher-workspace.helpers';
import type { StudentAssignment, ContentTab } from '../types/teacher-workspace.types';

interface TeacherAssignmentCardProps {
  assignment: StudentAssignment;
  activeTab: ContentTab;
  onSelect: () => void;
  onDelete: (id: string) => void;
}

export function TeacherAssignmentCard({
  assignment,
  activeTab,
  onSelect,
  onDelete,
}: TeacherAssignmentCardProps) {
  const isGraded = assignment.status === 'GRADED' || assignment.status === 'RETURNED';
  const isSubmitted = assignment.status === 'SUBMITTED' || Boolean(assignment.studentAttachmentUrl);
  const isMaterial = isMaterialItem(assignment);

  const displayImageUrl =
    activeTab === 'answers' && assignment.studentAttachmentUrl
      ? extractFirstImageUrl(assignment.studentAttachmentUrl)
      : extractFirstImageUrl(assignment.problemImageUrl) ||
        extractFirstImageUrl(assignment.promptTex);

  const isPdfOrDoc =
    Boolean(assignment.problemImageUrl) && isDocumentString(assignment.problemImageUrl);

  return (
    <div
      onClick={onSelect}
      className={`flex flex-col justify-between rounded-2xl border p-3 transition-colors cursor-pointer group min-h-[210px] ${
        isMaterial
          ? 'bg-surface border-transparent hover:border-brass-extra/40'
          : isGraded
            ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
            : 'border-hairline bg-surface hover:border-orange-500/40 hover:bg-surface/80'
      }`}>
      <div className="flex flex-col gap-2 min-w-0">
        {/* ზედა ბეიჯები */}
        <div className="flex items-center justify-between gap-1.5">
          {isGraded ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="size-3" /> ჩაბარებულია
            </span>
          ) : isSubmitted ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-win bg-win-tint px-2 py-0.5 rounded-md border border-win/30 truncate">
              <span className="size-1.5 rounded-full bg-win" />
              პასუხი მიღებულია
            </span>
          ) : null}
        </div>

        {/* ფაილის / სურათის პრევიუ */}
        {displayImageUrl ? (
          <div className="w-full h-32 rounded-xl border border-hairline/50 bg-black/40 p-1.5 flex items-center justify-center overflow-hidden shadow-inner">
            <img
              src={displayImageUrl}
              alt="დავალების სურათი"
              className="w-full h-full object-contain rounded bg-transparent"
            />
          </div>
        ) : isPdfOrDoc ? (
          <div className="w-full h-32 rounded-xl bg-paper-deep border border-hairline p-3 flex flex-col items-center justify-center text-center transition-colors group-hover:border-navy/40">
            <FileText className="size-9 text-navy mb-1.5 opacity-80" />
            <p className="text-xs font-bold text-ink line-clamp-1">{assignment.title}</p>
            <span className="text-[10px] font-semibold text-navy mt-1 opacity-80">
              ფაილის გახსნა ↗
            </span>
          </div>
        ) : assignment.promptTex ? (
          <div className="w-full h-32 rounded-xl bg-paper-deep border border-hairline/50 p-3 flex items-center justify-center overflow-hidden">
            <KatexPreview
              tex={assignment.promptTex}
              className="text-xs text-ink line-clamp-3 pointer-events-none leading-relaxed"
            />
          </div>
        ) : isMaterial ? (
          <div className="w-full h-32 rounded-xl bg-paper-deep border border-hairline p-3 flex flex-col items-center justify-center text-center transition-colors group-hover:border-brass/40">
            <Layers className="size-9 text-brass-strong mb-1.5 opacity-80" />
            <p className="text-xs font-bold text-ink line-clamp-1">{assignment.title}</p>
            <span className="text-[10px] font-semibold text-brass-strong mt-1 opacity-80">
              მასალის გახსნა ↗
            </span>
          </div>
        ) : null}
      </div>

      {/* ქვედა ზოლი */}
      <div className="flex items-center justify-between pt-2 border-t border-hairline/50">
        <span className="text-xs font-bold text-body group-hover:text-ink flex items-center gap-1 transition-colors">
          {isMaterial ? 'მასალის გახსნა' : 'ნახვა'}{' '}
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>

        <button
          type="button"
          title="წაშლა"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(assignment.id);
          }}
          className="flex size-7 items-center justify-center rounded-lg border border-transparent bg-transparent text-muted hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}