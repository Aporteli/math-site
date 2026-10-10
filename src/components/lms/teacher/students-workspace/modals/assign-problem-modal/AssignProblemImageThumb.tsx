'use client';

import { X } from 'lucide-react';
import type { AssignImage } from './types';

export function AssignProblemImageThumb({ image, onRemove }: { image: AssignImage; onRemove: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-box border border-hairline bg-navy/10 shadow-inner">
      <img src={image.dataUrl} alt={image.fileName} className="w-full h-24 object-contain bg-black/20" />
      <div className="absolute inset-x-0 bottom-0 bg-navy/10 backdrop-blur-xs border-t border-hairline px-2 py-1 flex items-center justify-between">
        <span className="text-[10px] font-mono font-medium text-mainText truncate">{image.fileName}</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-rose-500 hover:text-rose-400 p-0.5 rounded-box transition-colors cursor-pointer">
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
