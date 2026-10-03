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
    <div className="absolute bottom-full right-0 z-50 mb-2 w-32 rounded-box border border-hairline bg-main p-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
      <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-muted uppercase">სიმძლავრე</div>
      {BLUR_LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onSelect(level)}
          disabled={isLoading}
          className={`flex w-full cursor-pointer items-center justify-between rounded-box px-2.5 py-1.5 text-xs transition-all ${
            blurRadius === level
              ? 'bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
              : 'font-medium text-mainText hover:bg-sectionHeader'
          }`}>
          <span>{getBlurLabel(level)}</span>
          {blurRadius === level && <Check className="size-3.5 text-mainText" />}
        </button>
      ))}
    </div>
  );
}
