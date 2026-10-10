'use client';

export function SendProblemModalFooter({ onClose }: { onClose: () => void }) {
  return (
    <div className="pt-3 mt-2 border-t border-hairline flex justify-end">
      <button
        type="button"
        onClick={onClose}
        className="rounded-box bg-paper px-4 py-2 text-xs font-bold text-ink hover:bg-paper-deep transition">
        დახურვა
      </button>
    </div>
  );
}
