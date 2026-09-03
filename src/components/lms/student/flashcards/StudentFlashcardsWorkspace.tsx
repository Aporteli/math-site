"use client";

import { useState } from "react";
import { 
  Sparkles, 
  Layers, 
  Clock, 
  Send, 
  BookOpen, 
  MessageCircle,
  Info
} from "lucide-react";
import { addCommentAction } from "@/app/[locale]/(dashboard)/teacher/actions";
import { KatexPreview } from "@/components/math/katex-preview";
import type { Dictionary } from "@/i18n/types";

interface AssignmentItem {
  id: string;
  title: string;
  type: string;
  instructions: string | null;
  customPayload: {
    text?: string;
    promptTex?: string;
    [key: string]: unknown;
  };
  createdAt: string;
  course: { title: string };
  comments: {
    id: string;
    body: string;
    createdAt: string;
    author: { name: string; role: string };
  }[];
}

function formatDate(isoString: string) {
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatTime(isoString: string) {
  const d = new Date(isoString);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

type FlashcardsCopy = Dictionary["dashboard"]["student"]["flashcards"];

export function StudentFlashcardsWorkspace({
  initialAssignments,
  studentName,
  copy,
}: {
  initialAssignments: AssignmentItem[];
  studentName: string;
  copy: FlashcardsCopy;
}) {
  const [assignments, setAssignments] = useState<AssignmentItem[]>(initialAssignments);
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [commentPending, setCommentPending] = useState<string | null>(null);

  async function handleSendComment(assignmentId: string) {
    const text = commentInputs[assignmentId]?.trim();
    if (!text) return;

    setCommentPending(assignmentId);
    const res = await addCommentAction(assignmentId, text);
    setCommentPending(null);

    if (res.success && res.comment) {
      setAssignments((prev) =>
        prev.map((item) =>
          item.id === assignmentId
            ? {
                ...item,
                comments: [
                  ...item.comments,
                  {
                    id: res.comment.id,
                    body: res.comment.body,
                    createdAt: new Date().toISOString(),
                    author: {
                      name: res.comment.author.name,
                      role: res.comment.author.role,
                    },
                  },
                ],
              }
            : item
        )
      );
      setCommentInputs((prev) => ({ ...prev, [assignmentId]: "" }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-hairline bg-white p-3 px-5 shadow-sm">
        <span className="text-xs font-bold text-ink flex items-center gap-2">
          <Sparkles className="size-4 text-navy" />
          {copy.activeFormulas}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-deep px-3 py-1 text-xs font-bold text-muted">
          <Layers className="size-3.5" />
          {copy.totalCount.replace("{count}", String(assignments.length))}
        </span>
      </div>

      {assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-hairline bg-white/50 py-24 text-center backdrop-blur-sm">
          <div className="flex size-16 items-center justify-center rounded-full bg-paper-deep text-muted/50 mb-4">
            <Sparkles className="size-8" />
          </div>
          <h3 className="text-lg font-bold text-ink">{copy.emptyTitle}</h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {copy.emptyHint}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {assignments.map((item) => {
            const cardContent = item.customPayload?.text || item.customPayload?.promptTex;

            return (
              <div
                key={item.id}
                className="flex flex-col lg:flex-row overflow-hidden rounded-3xl border border-hairline bg-white shadow-sm transition-all hover:shadow-md"
              >
                {/* მარცხენა მხარე: ბარათის შინაარსი */}
                <div className="flex flex-col p-6 lg:w-[60%] xl:w-[65%]">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-navy-tint px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-navy">
                        {copy.cardBadge}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-paper px-2.5 py-1 text-[11px] font-semibold text-muted">
                        <BookOpen className="size-3" />
                        {item.course.title}
                      </span>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                      <Clock className="size-3.5" />
                      {formatDate(item.createdAt)}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-ink mb-6">{item.title}</h3>

                  {cardContent && (
                    <div className="relative rounded-2xl border border-hairline-soft bg-paper/40 p-5 mb-5 overflow-x-auto">
                      <div className="absolute -left-px top-4 h-8 w-1 rounded-r-full bg-navy" />
                      <div className="text-[15px] font-medium text-ink leading-relaxed">
                        <KatexPreview tex={String(cardContent)} displayMode />
                      </div>
                    </div>
                  )}

                  {item.instructions && (
                    <div className="mt-auto rounded-2xl border border-amber-200/50 bg-amber-50/50 p-4">
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                        <Info className="size-4" /> 
                        {copy.teacherNote}
                      </p>
                      <p className="mt-2 text-sm font-medium text-amber-900/80 leading-relaxed">
                        {item.instructions}
                      </p>
                    </div>
                  )}
                </div>

                {/* მარჯვენა მხარე: ჩატი */}
                <div className="flex flex-col border-t border-hairline lg:border-l lg:border-t-0 bg-paper/30 lg:w-[40%] xl:w-[35%]">
                  <div className="flex items-center gap-2 border-b border-hairline-soft bg-white/50 px-5 py-4">
                    <MessageCircle className="size-4 text-navy" />
                    <h4 className="text-sm font-bold text-ink">{copy.discussion}</h4>
                    <span className="ml-auto rounded-full bg-paper-deep px-2 py-0.5 text-[10px] font-bold text-muted">
                      {item.comments.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[350px] lg:max-h-[450px]">
                    {item.comments.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center text-center opacity-60">
                        <Sparkles className="size-8 text-muted mb-2" />
                        <p className="text-xs font-semibold text-ink">{copy.noQuestions}</p>
                        <p className="text-[11px] text-muted max-w-[200px] mt-1">
                          {copy.noQuestionsHint}
                        </p>
                      </div>
                    ) : (
                      item.comments.map((c) => {
                        const isTeacher = c.author.role === "TEACHER";
                        return (
                          <div
                            key={c.id}
                            className={`flex flex-col max-w-[90%] ${
                              isTeacher ? "items-start mr-auto" : "items-end ml-auto"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1 px-1">
                              <span className="text-[10px] font-bold text-muted">
                                {isTeacher ? copy.teacher : studentName}
                              </span>
                              <span className="text-[9px] text-muted/60">
                                {formatTime(c.createdAt)}
                              </span>
                            </div>
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                                isTeacher
                                  ? "bg-white border border-hairline text-ink rounded-tl-sm"
                                  : "bg-navy text-white rounded-tr-sm"
                              }`}
                            >
                              {c.body}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="border-t border-hairline-soft bg-white p-4">
                    <div className="relative flex items-end gap-2">
                      <textarea
                        rows={1}
                        value={commentInputs[item.id] || ""}
                        onChange={(e) => {
                          setCommentInputs({ ...commentInputs, [item.id]: e.target.value });
                          e.target.style.height = 'auto';
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendComment(item.id);
                          }
                        }}
                        placeholder={copy.messagePlaceholder}
                        className="max-h-[100px] min-h-[44px] flex-1 resize-none rounded-2xl border border-hairline bg-paper px-4 py-3 text-[13px] outline-none transition-colors focus:border-navy focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendComment(item.id)}
                        disabled={commentPending === item.id || !commentInputs[item.id]?.trim()}
                        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-navy text-white transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                      >
                        {commentPending === item.id ? (
                          <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <Send className="size-4 -ml-0.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}