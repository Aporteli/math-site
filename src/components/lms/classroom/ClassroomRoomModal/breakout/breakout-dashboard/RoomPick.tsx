'use client';

export function RoomPick({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-box text-[11px] font-bold transition-all duration-200 ${
        selected
          ? 'bg-[#A66A32] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]'
          : 'border border-hairline bg-main text-mainText hover:bg-mainButtonHover'
      }`}>
      {label}
    </button>
  );
}
