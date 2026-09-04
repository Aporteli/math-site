'use client';

import { Plus, Video } from 'lucide-react';

interface TeacherStudentsHeroAsideProps {
  studentsCount: number;
  cardsCount: number;
  canSendCard: boolean;
  onStartClassCall: () => void;
  onOpenAssignModal: () => void;
}

export function TeacherStudentsHeroAside({
  studentsCount,
  cardsCount,
  canSendCard,
  onStartClassCall,
  onOpenAssignModal,
}: TeacherStudentsHeroAsideProps) {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
        <div className="rounded-xl border border-hairline bg-white px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">სულ მოსწავლე</p>
          <p className="mt-1 text-2xl font-bold text-ink">{studentsCount}</p>
        </div>
        <div className="rounded-xl border border-hairline bg-white px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">ხელმისაწვდომი ბარათები</p>
          <p className="mt-1 text-2xl font-bold text-ink">{cardsCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onStartClassCall}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-hairline bg-white py-2.5 px-2 text-xs font-bold text-ink hover:border-navy/60 hover:bg-navy-tint/20 hover:text-navy active:scale-98 transition-all cursor-pointer min-w-0 shadow-sm">
          <div className="flex size-5 shrink-0 items-center justify-center rounded-lg bg-navy/15 text-navy">
            <Video className="size-3" />
          </div>
          <span className="truncate">გაკვეთილი</span>
        </button>

        <button
          type="button"
          onClick={onOpenAssignModal}
          disabled={!canSendCard}
          title={canSendCard ? 'ბარათის გაგზავნა' : 'აირჩიეთ მოსწავლე ბარათის გასაგზავნად'}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-hairline bg-white py-2.5 px-2 text-xs font-bold text-ink hover:border-brass/60 hover:bg-brass-tint/30 hover:text-brass-strong active:scale-98 transition-all cursor-pointer min-w-0 shadow-sm disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-hairline disabled:hover:bg-white disabled:hover:text-ink">
          <div className="flex size-5 shrink-0 items-center justify-center rounded-lg bg-brass-tint text-brass-strong">
            <Plus className="size-3" />
          </div>
          <span className="truncate">ბარათი</span>
        </button>
      </div>
    </div>
  );
}
