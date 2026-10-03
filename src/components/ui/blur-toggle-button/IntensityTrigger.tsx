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
      className="ml-1 flex cursor-pointer items-center gap-0.5 rounded-box border-l border-hairline px-1.5 py-1 text-[11px] font-medium text-mainText transition-all hover:bg-sectionHeader">
      <span className="font-bold text-[#465D73]">{getBlurLabel(blurRadius)}</span>
      <ChevronDown
        className={`size-3 text-icons transition-transform duration-200 ${showOptions ? 'rotate-180' : ''}`}
      />
    </button>
  );
}
