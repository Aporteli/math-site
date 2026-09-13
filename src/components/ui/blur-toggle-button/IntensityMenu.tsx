'use client';

import { Check } from 'lucide-react';
import { BLUR_LEVELS, getBlurLabel, type BlurLevel } from './constants';

interface IntensityMenuProps {
  blurRadius: number;
  isLoading: boolean;
  onSelect: (level: BlurLevel) => void;
}

export function IntensityMenu({ blurRadius, isLoading, onSelect }: IntensityMenuProps) {
  return (
    <div className="absolute bottom-full right-0 mb-2 z-50 w-32 rounded-xl border border-white/10 bg-slate-800 p-1 shadow-2xl backdrop-blur-xl">
      <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">სიმძლავრე</div>
      {BLUR_LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onSelect(level)}
          disabled={isLoading}
          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
            blurRadius === level
              ? 'bg-amber-500/15 text-amber-400 font-semibold'
              : 'text-slate-300 hover:bg-white/5 hover:text-white'
          }`}>
          <span>{getBlurLabel(level)}</span>
          {blurRadius === level && <Check className="size-3.5 text-amber-400" />}
        </button>
      ))}
    </div>
  );
}
