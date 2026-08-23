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

interface AssignmentItem {
  id: string;
  title: string;
  type: string;
  instructions: string | null;
  customPayload: any;
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

export function StudentFlashcardsWorkspace({
  initialAssignments,
  studentName,
}: {
  initialAssignments: AssignmentItem[];
  studentName: string;
}) {
  const [assignments, setAssignments] = useState<AssignmentItem[]>(initialAssignments);
  const [activeTab, setActiveTab] = useState<"ALL" | "FLASHCARD" | "PROBLEM">("ALL");
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [commentPending, setCommentPending] = useState<string | null>(null);

  const filteredAssignments = assignments.filter((a) => {
    if (activeTab === "ALL") return true;
    return a.type === activeTab;
  });

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
      {/* თანამედროვე ფილტრები (Segmented Control სტილში) */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-hairline bg-white p-2 shadow-sm">
        <div className="flex gap-1 overflow-x-auto p-1">
          {(["ALL", "FLASHCARD", "PROBLEM"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "bg-navy text-white shadow-md"
                  : "bg-transparent text-muted hover:bg-paper-deep hover:text-ink"
              }`}
            >
              {tab === "ALL" && "ყველა დავალება"}
              {tab === "FLASHCARD" && "სასწავლო ბარათები"}
              {tab === "PROBLEM" && "ამოცანები"}
            </button>
          ))}
        </div>

        <div className="pr-4 hidden sm:block">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-deep px-3 py-1 text-xs font-bold text-muted">
            <Layers className="size-3.5" />
            ნაჩვენებია: {filteredAssignments.length}
          </span>
        </div>
      </div>

      {/* ბარათების სია */}
      {filteredAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-hairline bg-white/50 py-24 text-center backdrop-blur-sm">
          <div className="flex size-16 items-center justify-center rounded-full bg-paper-deep text-muted/50 mb-4">
            <Layers className="size-8" />
          </div>
          <h3 className="text-lg font-bold text-ink">დავალებები არ მოიძებნა</h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            ამ კატეგორიაში მასწავლებელს თქვენთვის ჯერ არაფერი გამოუგზავნია.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {filteredAssignments.map((item) => (
            <div
              key={item.id}
              className="flex flex-col lg:flex-row overflow-hidden rounded-3xl border border-hairline bg-white shadow-sm transition-all hover:shadow-md"
            >
              {/* მარცხენა მხარე: კონტენტი და დავალება */}
              <div className="flex flex-col p-6 lg:w-[60%] xl:w-[65%]">
                
                {/* ბარათის ჰედერი */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-navy-tint px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-navy">
                      {item.type === "FLASHCARD" ? "ბარათი" : "ამოცანა"}
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

                {/* მთავარი ამოცანის პირობა */}
                {item.customPayload?.text && (
                  <div className="relative rounded-2xl border border-hairline-soft bg-paper/40 p-5 mb-5">
                    <div className="absolute -left-px top-4 h-8 w-1 rounded-r-full bg-navy" />
                    <div className="text-[15px] font-medium text-ink leading-relaxed">
                      <KatexPreview tex={item.customPayload.text} />
                    </div>
                  </div>
                )}

                {/* მასწავლებლის ინსტრუქცია (თუ არსებობს) */}
                {item.instructions && (
                  <div className="mt-auto rounded-2xl border border-amber-200/50 bg-amber-50/50 p-4">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                      <Info className="size-4" /> 
                      მასწავლებლის მითითება
                    </p>
                    <p className="mt-2 text-sm font-medium text-amber-900/80 leading-relaxed">
                      {item.instructions}
                    </p>
                  </div>
                )}
              </div>

              {/* მარჯვენა მხარე: ჩატი და დისკუსია */}
              <div className="flex flex-col border-t border-hairline lg:border-l lg:border-t-0 bg-paper/30 lg:w-[40%] xl:w-[35%]">
                
                <div className="flex items-center gap-2 border-b border-hairline-soft bg-white/50 px-5 py-4">
                  <MessageCircle className="size-4 text-navy" />
                  <h4 className="text-sm font-bold text-ink">დისკუსია</h4>
                  <span className="ml-auto rounded-full bg-paper-deep px-2 py-0.5 text-[10px] font-bold text-muted">
                    {item.comments.length}
                  </span>
                </div>

                {/* შეტყობინებების ველი */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[350px] lg:max-h-[450px]">
                  {item.comments.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center opacity-60">
                      <Sparkles className="size-8 text-muted mb-2" />
                      <p className="text-xs font-semibold text-ink">კითხვები არ არის</p>
                      <p className="text-[11px] text-muted max-w-[200px] mt-1">
                        თუ ამოცანის პირობა გაუგებარია, მოგვწერეთ აქ.
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
                              {isTeacher ? "მასწავლებელი" : "შენ"}
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

                {/* კომენტარის შეყვანა */}
                <div className="border-t border-hairline-soft bg-white p-4">
                  <div className="relative flex items-end gap-2">
                    <textarea
                      rows={1}
                      value={commentInputs[item.id] || ""}
                      onChange={(e) => {
                        setCommentInputs({ ...commentInputs, [item.id]: e.target.value });
                        // ტექსტარიას სიმაღლის ავტომატური ზრდა (მცირე hack)
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendComment(item.id);
                        }
                      }}
                      placeholder="დაწერეთ შეტყობინება..."
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
                  <p className="text-[10px] text-muted text-center mt-2">
                    გასაგზავნად დააჭირეთ <kbd className="font-sans px-1 rounded border border-hairline bg-paper">Enter</kbd>-ს
                  </p>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}