'use client';

import { Send, Sparkles } from 'lucide-react';

interface Props {
  selectedPagesCount: number;
  onAskAI: () => void;
  onOpenSend: () => void;
}

export function TeacherActions({ selectedPagesCount, onAskAI, onOpenSend }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
      <button
        type="button"
        onClick={onAskAI}
        title="დაფის გაგზავნა AI-სთვის"
        className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-box bg-[#465D73] px-2 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)] active:scale-[0.98] sm:h-8 sm:gap-1.5 sm:px-2.5">
        <Sparkles className="size-3.5 shrink-0" />
        <span>AI-ს კითხვა {selectedPagesCount > 0 ? `(${selectedPagesCount})` : ''}</span>
      </button>

      <button
        type="button"
        onClick={onOpenSend}
        title="დაფის სურათის გაგზავნა მოსწავლესთან"
        className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-box bg-[#A66A32] px-2 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_5px_rgba(166,106,50,0.22)] transition-all duration-200 hover:bg-[#B8783B] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_4px_12px_rgba(166,106,50,0.28)] active:scale-[0.98] sm:h-8 sm:gap-1.5 sm:px-2.5">
        <Send className="size-3.5" />
        <span>გაგზავნა {selectedPagesCount > 0 ? `(${selectedPagesCount})` : ''}</span>
      </button>
    </div>
  );
}