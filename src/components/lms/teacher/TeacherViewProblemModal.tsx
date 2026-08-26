"use client";

import { useState } from "react";
import { X, BookOpen, MessageSquare, Send } from "lucide-react";
import { KatexPreview } from "@/components/math/katex-preview";

interface TeacherViewProblemModalProps {
  assignment: {
    title: string;
    promptTex: string;
    type: string;
    instructions?: string | null;
  };
  studentName: string;
  onClose: () => void;
  // ფუნქცია, რომელიც მშობლიდან გადმოეცემა კომენტარის ბაზაში შესანახად
  onSubmitComment?: (comment: string) => void;
}

export function TeacherViewProblemModal({
  assignment,
  studentName,
  onClose,
  onSubmitComment,
}: TeacherViewProblemModalProps) {
  const promptText = assignment.promptTex || assignment.instructions || "პირობა არ მოიძებნა";
  const [comment, setComment] = useState("");

  const handleSendComment = () => {
    if (comment.trim() && onSubmitComment) {
      onSubmitComment(comment);
      setComment(""); // გაგზავნის შემდეგ ველის გასუფთავება
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-navy-tint text-navy">
              <BookOpen className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">
                {studentName} — {assignment.title}
              </h3>
              <p className="text-xs text-muted">გაგზავნილი ბარათი / ამოცანა</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ამოცანის პირობა */}
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
              ამოცანის პირობა
            </h4>
            <div className="rounded-2xl border border-hairline-soft bg-paper/60 p-6 overflow-x-auto shadow-inner">
              <KatexPreview
                tex={promptText}
                displayMode
                className="text-ink text-sm sm:text-base leading-relaxed"
              />
            </div>
          </div>

          {/* კომენტარის ველი */}
          <div>
            <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
              <MessageSquare className="size-3.5" />
              კომენტარის დამატება
            </h4>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="მიწერეთ კომენტარი ან დამატებითი ინსტრუქცია მოსწავლეს..."
              className="w-full resize-none rounded-xl border border-hairline bg-paper p-4 text-sm text-ink outline-none transition-colors focus:border-navy focus:bg-white focus:ring-1 focus:ring-navy"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-hairline bg-paper/40 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-hairline bg-white px-5 py-2 text-xs font-bold text-ink shadow-xs transition-colors hover:bg-paper"
          >
            დახურვა
          </button>
          
          <button
            type="button"
            onClick={handleSendComment}
            disabled={!comment.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-navy-strong disabled:opacity-50"
          >
            <Send className="size-3.5" />
            <span>კომენტარის გაგზავნა</span>
          </button>
        </div>
      </div>
    </div>
  );
}