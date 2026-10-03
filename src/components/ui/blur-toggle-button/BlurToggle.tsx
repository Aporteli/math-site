'use client';

import { Sparkles } from 'lucide-react';

interface BlurToggleProps {
  isBlurred: boolean;
  isLoading: boolean;
  onClick: () => void;
}

export function BlurToggle({ isBlurred, isLoading, onClick }: BlurToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={`group flex cursor-pointer items-center gap-1.5 rounded-box px-2.5 py-1 text-xs transition-all duration-200 ${
        isBlurred
          ? 'bg-[#A66A32] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_5px_rgba(166,106,50,0.22)] hover:bg-[#B8783B]'
          : 'font-medium text-mainText hover:bg-sectionHeader'
      } ${isLoading ? 'cursor-wait opacity-45' : ''}`}>
      <Sparkles
        className={`size-3.5 transition-transform duration-300 ${
          isBlurred ? 'scale-110 text-white' : 'text-icons group-hover:text-mainText'
        }`}
      />
      <span>{isLoading ? '...' : isBlurred ? 'On' : 'Off'}</span>
    </button>
  );
}
