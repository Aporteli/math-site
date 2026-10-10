'use client';

import { Send, Sparkles } from 'lucide-react';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';

export function PageActionControls({ model }: { model: TeacherWhiteboardModel }) {
  const {
    handleOpenAssignModal,
    setIsAiModalOpen,
  } = model;
  return (
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                title="AI ასისტენტი"
                className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-box bg-[#465D73] px-2.5 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] active:scale-[0.98] sm:h-8">
                <Sparkles className="size-3.5 animate-pulse" />
                <span>AI</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAssignModal}
                title="დაფის სურათის გაგზავნა მოსწავლეებთან"
                className="flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-box bg-[#A66A32] px-3 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_5px_rgba(166,106,50,0.22)] transition-all duration-200 hover:bg-[#B8783B] active:scale-[0.98] sm:h-8">
                <Send className="size-3.5" />
                <span>გაგზავნა</span>
              </button>
            </div>
  );
}
