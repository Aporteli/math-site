'use client';

import { UploadCloud } from 'lucide-react';

export function AssignProblemDragOverlay({ isDraggingOver }: { isDraggingOver: boolean }) {
  if (!isDraggingOver) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-navy/10 backdrop-blur-[2px]">
      <div className="flex size-14 items-center justify-center rounded-box bg-navy text-white shadow-lg">
        <UploadCloud className="size-7" />
      </div>
      <p className="text-sm font-bold text-navy">ჩააგდეთ სურათი აქ</p>
      <p className="text-xs text-navy/70">PNG, JPG, WEBP</p>
    </div>
  );
}
