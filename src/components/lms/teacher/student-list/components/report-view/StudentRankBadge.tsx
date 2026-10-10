'use client';

export function StudentRankBadge({ index }: { index: number }) {
  return (
    <span
      className={`flex size-7 shrink-0 items-center justify-center rounded-box text-[11px] font-black ${
        index === 0
          ? 'bg-brass text-white'
          : index === 1
            ? 'bg-brass/60 text-white'
            : index === 2
              ? 'bg-brass/40 text-brass-strong'
              : 'bg-paper-deep text-muted'
      }`}>
      {index + 1}
    </span>
  );
}
