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
      className={`group flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
        isBlurred
          ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20 hover:bg-amber-400'
          : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
      } ${isLoading ? 'cursor-wait opacity-60' : ''}`}>
      <Sparkles
        className={`size-3.5 transition-transform duration-300 ${
          isBlurred ? 'scale-110 text-slate-950' : 'text-slate-400 group-hover:rotate-12'
        }`}
      />
      <span>{isLoading ? '...' : isBlurred ? 'On' : 'Off'}</span>
    </button>
  );
}
