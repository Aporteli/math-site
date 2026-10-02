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
        <div className="rounded-box border border-hairline bg-main px-4 py-3 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">სულ მოსწავლე</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-ink">{studentsCount}</p>
        </div>
        <div className="rounded-box border border-hairline bg-white px-4 py-3 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">ხელმისაწვდომი ბარათები</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-navy">{cardsCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onStartClassCall}
          className="inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-box bg-[#465D73] px-3 py-3 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)] active:scale-[0.98]">
          <Video className="size-4 shrink-0" />
          <span className="truncate">გაკვეთილი</span>
        </button>

        <button
          type="button"
          onClick={onOpenAssignModal}
          disabled={!canSendCard}
          title={canSendCard ? 'ბარათის გაგზავნა' : 'აირჩიეთ მოსწავლე ბარათის გასაგზავნად'}
          className="inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-box bg-[#A66A32] px-3 py-3 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_5px_rgba(166,106,50,0.22)] transition-all duration-200 hover:bg-[#B8783B] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_4px_12px_rgba(166,106,50,0.28)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
          <Plus className="size-4 shrink-0" />
          <span className="truncate">ბარათი</span>
        </button>
      </div>
    </div>
  );
}
