"use client";

import { useState } from "react";
import { X, BookOpen, MessageSquare, Send, CheckCircle2, ZoomIn, FileText } from "lucide-react";
import { KatexPreview } from "@/components/math/katex-preview";

interface TeacherViewProblemModalProps {
  assignment: {
    id: string;
    submissionId?: string;
    title: string;
    promptTex?: string;
    type: string;
    instructions?: string | null;
    status: string;
    attachmentUrl?: string | null;
  };
  studentName: string;
  onClose: () => void;
  onSubmitComment?: (comment: string) => void;
  onMarkAsGraded?: (assignment: any) => void;
}

export function TeacherViewProblemModal({
  assignment,
  studentName,
  onClose,
  onSubmitComment,
  onMarkAsGraded,
}: TeacherViewProblemModalProps) {
  const promptText = assignment.promptTex || assignment.instructions || "პირობა არ მოიძებნა";
  const [comment, setComment] = useState("");
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const handleSendComment = () => {
    if (comment.trim() && onSubmitComment) {
      onSubmitComment(comment);
      setComment("");
    }
  };

  // ამოვიღოთ სურათები (შეიძლება იყოს JSON მასივი ჯგუფური ატვირთვისას, ან ერთი URL)
  let attachments: string[] = [];
  if (assignment.attachmentUrl) {
    try {
      const parsed = JSON.parse(assignment.attachmentUrl);
      if (Array.isArray(parsed)) {
        attachments = parsed;
      } else {
        attachments = [assignment.attachmentUrl];
      }
    } catch {
      // თუ JSON.parse ვერ მოხერხდა, ჩავთვალოთ რომ უბრალო URL-ია
      attachments = [assignment.attachmentUrl];
    }
  }

  const isGraded = assignment.status === "GRADED";

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-hairline px-6 py-4 bg-paper/30">
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
              className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-rose-50 hover:text-rose-600 transition-colors"
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

            {/* მოსწავლის გამოგზავნილი პასუხები (სურათები) */}
            <div className="pt-4 border-t border-hairline-soft">
              <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                <FileText className="size-3.5" />
                მოსწავლის პასუხები
              </h4>
              
              {attachments.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {attachments.map((url, idx) => (
                    <div 
                      key={idx} 
                      className="group relative cursor-zoom-in aspect-[3/4] rounded-xl border border-hairline overflow-hidden bg-paper"
                      onClick={() => setFullscreenImage(url)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={url} 
                        alt={`პასუხი ${idx + 1}`} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-white/90 px-2 py-1 rounded-lg text-xs font-bold text-ink shadow-sm backdrop-blur-sm transition-opacity">
                          <ZoomIn className="size-3" /> ნახვა
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-hairline bg-paper/50 py-10 text-center text-muted">
                  <FileText className="size-8 mx-auto opacity-30 mb-2" />
                  <p className="text-sm font-bold text-ink">პასუხი არ არის მიმაგრებული</p>
                  <p className="text-xs mt-1">მოსწავლეს ჯერ არ აუტვირთავს სურათი/ფაილი.</p>
                </div>
              )}
            </div>

            {/* კომენტარის ველი */}
            <div className="pt-4 border-t border-hairline-soft">
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

          {/* Footer - აქ არის ჩაბარებულად მონიშვნის ღილაკი */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline bg-paper/40 px-6 py-4">
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-hairline bg-white px-5 py-2.5 text-sm font-bold text-ink shadow-xs transition-colors hover:bg-paper"
              >
                დახურვა
              </button>

              {/* ჩაბარებულად მონიშვნის ღილაკი */}
              {onMarkAsGraded && !isGraded && (
                <button
                  type="button"
                  onClick={() => {
                    onMarkAsGraded(assignment);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-700 shadow-xs transition-colors hover:bg-emerald-600 hover:text-white"
                >
                  <CheckCircle2 className="size-4" />
                  <span>ჩაბარებულად მონიშვნა</span>
                </button>
              )}
            </div>
            
            <button
              type="button"
              onClick={handleSendComment}
              disabled={!comment.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-6 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-navy-strong disabled:opacity-50"
            >
              <Send className="size-4" />
              <span>გაგზავნა</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Preview */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative flex h-full w-full items-center justify-center">
            <button
              type="button"
              className="absolute top-4 right-4 flex size-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-rose-500"
              onClick={() => setFullscreenImage(null)}
            >
              <X className="size-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullscreenImage}
              alt="გადიდებული გვერდი"
              className="max-h-[95vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}