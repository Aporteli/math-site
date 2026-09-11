"use client";

export function ClassroomError({ error, onClose }: { error: string | null; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-8 max-w-sm text-center shadow-2xl">
        <p className="text-sm font-bold text-rose-600">
          {error || "წვდომა უარყოფილია"}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-navy px-5 py-2 text-xs font-bold text-white hover:bg-navy-strong transition-colors"
        >
          დახურვა
        </button>
      </div>
    </div>
  );
}