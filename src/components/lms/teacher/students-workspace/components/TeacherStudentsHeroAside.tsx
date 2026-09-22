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
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-hairline bg-white px-4 py-3 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">სულ მოსწავლე</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-ink">{studentsCount}</p>
        </div>
        <div className="rounded-2xl border border-hairline bg-white px-4 py-3 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">ხელმისაწვდომი ბარათები</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-navy">{cardsCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onStartClassCall}
          className="inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-navy px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-navy-strong"
        >
          <Video className="size-4 shrink-0" />
          <span className="truncate">გაკვეთილი</span>
        </button>

        <button
          type="button"
          onClick={onOpenAssignModal}
          disabled={!canSendCard}
          title={canSendCard ? 'ბარათის გაგზავნა' : 'აირჩიეთ მოსწავლე ბარათის გასაგზავნად'}
          className="inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brass-strong px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brass disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Plus className="size-4 shrink-0" />
          <span className="truncate">ბარათი</span>
        </button>
      </div>
    </div>
  );
}
