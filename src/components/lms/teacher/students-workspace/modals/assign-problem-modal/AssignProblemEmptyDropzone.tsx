'use client';

import type { RefObject } from 'react';
import { UploadCloud } from 'lucide-react';

export function AssignProblemEmptyDropzone({ assignFileRef }: { assignFileRef: RefObject<HTMLInputElement | null> }) {
  return (
    <button
      type="button"
      onClick={() => assignFileRef.current?.click()}
      className="group flex flex-col items-center justify-center gap-2.5 h-52 rounded-box border-2 border-dashed border-hairline/80 bg-navy/5 hover:border-navy hover:bg-surface/80 transition-all cursor-pointer">
      <div className="flex size-10 items-center justify-center rounded-box bg-paper-deep text-muted group-hover:bg-navy group-hover:text-white transition-all shadow-2xs">
        <UploadCloud className="size-5" />
      </div>
      <div className="text-center space-y-0.5">
        <p className="text-xs font-bold text-mainText group-hover:text-navy transition-colors">
          ატვირთეთ ან ჩააგდეთ სურათი
        </p>
        <p className="text-[10px] font-mono text-muted">PNG, JPG, WEBP (მაქს. 10MB)</p>
        <p className="text-[10px] text-muted">ან ჩასვით Ctrl+V-ით</p>
      </div>
    </button>
  );
}
