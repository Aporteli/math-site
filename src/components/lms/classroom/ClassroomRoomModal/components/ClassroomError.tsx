"use client";

export function ClassroomError({ error, onClose }: { error: string | null; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-box border border-hairline bg-paper p-8 text-center shadow-2xl">
        <p className="text-sm font-bold text-rose-500">{error || 'წვდომა უარყოფილია'}</p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex cursor-pointer items-center justify-center rounded-box bg-[#465D73] px-5 py-2 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] active:scale-[0.98]">
          დახურვა
        </button>
      </div>
    </div>
  );
}