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
        className="flex items-center gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium transition-colors shadow-xs shrink-0">
        <Sparkles className="size-3.5 text-amber-300" />
        <span>AI-ს კითხვა {selectedPagesCount > 0 ? `(${selectedPagesCount})` : ''}</span>
      </button>

      <button
        type="button"
        onClick={onOpenSend}
        title="დაფის სურათის გაგზავნა მოსწავლესთან"
        className="flex items-center gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-xs shrink-0">
        <Send className="size-3.5" />
        <span>გაგზავნა {selectedPagesCount > 0 ? `(${selectedPagesCount})` : ''}</span>
      </button>
    </div>
  );
}