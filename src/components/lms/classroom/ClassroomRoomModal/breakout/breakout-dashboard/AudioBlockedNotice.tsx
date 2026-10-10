'use client';

export function AudioBlockedNotice({ onResume }: { onResume: () => void }) {
  return (
    <button
      type="button"
      onClick={onResume}
      className="mb-3 w-full cursor-pointer rounded-box border border-brass/20 bg-brass-tint px-3 py-2 text-left text-xs font-bold leading-5 text-brass-strong">
      მოსმენა დაბლოკილია ბრაუზერმა. დააჭირეთ ხმის ჩასართავად.
    </button>
  );
}
