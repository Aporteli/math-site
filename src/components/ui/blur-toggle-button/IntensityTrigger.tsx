'use client';

import { ChevronDown } from 'lucide-react';
import { getBlurLabel } from './constants';

interface IntensityTriggerProps {
  blurRadius: number;
  showOptions: boolean;
  isLoading: boolean;
  onClick: () => void;
}

export function IntensityTrigger({ blurRadius, showOptions, isLoading, onClick }: IntensityTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="ml-1 flex items-center gap-0.5 rounded-md border-l border-white/10 px-1.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-all">
      <span className="text-amber-400 font-semibold">{getBlurLabel(blurRadius)}</span>
      <ChevronDown
        className={`size-3 text-slate-400 transition-transform duration-200 ${showOptions ? 'rotate-180' : ''}`}
      />
    </button>
  );
}
