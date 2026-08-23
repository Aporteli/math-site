"use client";

import { useState } from "react";
import { 
  Users, 
  Send, 
  MessageSquare, 
  Sparkles, 
  Clock, 
  ChevronRight, 
  BookOpen, 
  Mail, 
  Layers, 
  FolderOpen,
  PlusCircle,
  History,
  Info
} from "lucide-react";
import { createAssignmentAction, addCommentAction } from "@/app/[locale]/(dashboard)/teacher/actions";
import { ProblemPickerModal, type SetProblem } from "@/components/lms/ProblemPickerModal";
import { KatexPreview } from "@/components/math/katex-preview";

export interface StudentData {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  courses: { id: string; title: string }[];
  assignments: {
    id: string;
    title: string;
    type: string;
    instructions: string | null;
    customPayload?: any;
    status: string;
    createdAt: string;
    comments: {
      id: string;
      body: string;
      createdAt: string;
      author: { name: string; role: string };
    }[];
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

export function TeacherStudentsWorkspace({
  initialStudents,
  courses,
  availableSetProblems = [],
}: {
  initialStudents: StudentData[];
  courses: { id: string; title: string }[];
  availableSetProblems?: SetProblem[];
}) {
  const [students, setStudents] = useState<StudentData[]>(initialStudents);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    initialStudents[0]?.id || null
  );

  // Tab State: ახალი დავალების გაგზავნა ან ისტორია/ჩატი
  const [activeTab, setActiveTab] = useState<"NEW" | "HISTORY">("NEW");

  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<"FLASHCARD" | "PROBLEM">("FLASHCARD");
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [instructions, setInstructions] = useState("");
  const [problemContent, setProblemContent] = useState("");
  const [pending, setPending] = useState(false);

  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [commentPending, setCommentPending] = useState<string | null>(null);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  function handleSelectProblem(problem: SetProblem) {
    setTitle(problem.title || "ახალი დავალება");
    setProblemContent(problem.promptTex || "");
    setType("FLASHCARD");
  }

  async function handleSendAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudentId || !title.trim()) return;

    setPending(true);
    const res = await createAssignmentAction({
      title,
      type,
      courseId,
      targetUserId: selectedStudentId,
      instructions,
      content: { text: problemContent },
    });

    setPending(false);

    if (res.success && res.assignmentId) {
      const newAssignment = {
        id: res.assignmentId,
        title,
        type,
        instructions: instructions || null,
        customPayload: { text: problemContent },
        status: "DRAFT",
        createdAt: new Date().toISOString(),
        comments: [],
      };

      setStudents((prev) =>
        prev.map((s) =>
          s.id === selectedStudentId
            ? { ...s, assignments: [newAssignment, ...s.assignments] }
            : s
        )
      );

      setTitle("");
      setInstructions("");
      setProblemContent("");
      // წარმატებით გაგზავნის შემდეგ ავტომატურად გადავრთავთ ისტორიის ჩანართზე
      setActiveTab("HISTORY");
    }
  }

  async function handleSendComment(assignmentId: string) {
    const text = commentInputs[assignmentId]?.trim();
    if (!text) return;

    setCommentPending(assignmentId);
    const res = await addCommentAction(assignmentId, text);
    setCommentPending(null);

    if (res.success && res.comment) {
      setStudents((prev) =>
        prev.map((s) => ({
          ...s,
          assignments: s.assignments.map((a) =>
            a.id === assignmentId
              ? {
                  ...a,
                  comments: [
                    ...a.comments,
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
              : a
          ),
        }))
      );
      setCommentInputs((prev) => ({ ...prev, [assignmentId]: "" }));
    }
  }

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-hairline bg-white py-24 text-center shadow-sm">
        <div className="flex size-16 items-center justify-center rounded-full bg-paper-deep text-muted/50 mb-4">
          <Users className="size-8" />
        </div>
        <h3 className="text-lg font-bold text-ink">მოსწავლეები არ მოიძებნა</h3>
        <p className="mt-1 max-w-sm text-sm text-muted">
          თქვენს კურსებში ჯერ არცერთი მოსწავლე არ არის გაწევრიანებული.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
      {/* მარცხენა პანელი: მოსწავლეთა სია */}
      <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6">
        <div className="rounded-3xl border border-hairline bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-hairline-soft mb-4">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-muted">
              ჩემი კლასები ({students.length})
            </h3>
          </div>

          <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1 hide-scrollbar">
            {students.map((student) => {
              const isSelected = student.id === selectedStudentId;
              const assignmentCount = student.assignments.length;
              return (
                <button
                  key={student.id}
                  onClick={() => {
                    setSelectedStudentId(student.id);
                    setActiveTab("NEW");
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${
                    isSelected
                      ? "border-navy bg-navy-tint/40 shadow-sm"
                      : "border-hairline bg-paper-deep/30 hover:border-navy/40 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`flex size-11 shrink-0 items-center justify-center rounded-full font-bold text-sm transition-colors ${
                        isSelected ? "bg-navy text-white shadow-md" : "bg-white border border-hairline text-navy group-hover:bg-navy-tint"
                      }`}
                    >
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <p className={`font-bold text-sm truncate transition-colors ${isSelected ? "text-navy" : "text-ink"}`}>
                        {student.name}
                      </p>
                      <p className="text-[11px] text-muted truncate mt-0.5 flex items-center gap-1">
                        <Layers className="size-3" />
                        {assignmentCount} დავალება
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`size-4 transition-transform ${
                      isSelected ? "text-navy translate-x-1" : "text-muted/50 group-hover:text-navy/50 group-hover:translate-x-0.5"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* მარჯვენა პანელი: არჩეული მოსწავლის სამუშაო სივრცე */}
      <div className="lg:col-span-8 space-y-6">
        {selectedStudent && (
          <>
            {/* მოსწავლის პროფილი და ნავიგაცია */}
            <div className="rounded-3xl border border-hairline bg-white shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-navy-tint/50 via-white to-white">
                <div className="flex items-center gap-5">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-navy text-2xl font-bold text-white shadow-lg shadow-navy/20">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-ink">{selectedStudent.name}</h2>
                    <p className="flex items-center gap-1.5 text-sm text-muted mt-1">
                      <Mail className="size-4" />
                      {selectedStudent.email}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedStudent.courses.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-sm"
                    >
                      <BookOpen className="size-3.5 text-navy" />
                      {c.title}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-t border-hairline bg-paper/50 px-2 pt-2">
                <button
                  onClick={() => setActiveTab("NEW")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-t-2xl px-4 py-3.5 text-sm font-bold transition-colors ${
                    activeTab === "NEW"
                      ? "bg-white text-navy shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] border-x border-t border-hairline"
                      : "text-muted hover:text-ink hover:bg-paper-deep/50"
                  }`}
                >
                  <PlusCircle className="size-4.5" />
                  ახალი დავალება
                </button>
                <button
                  onClick={() => setActiveTab("HISTORY")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-t-2xl px-4 py-3.5 text-sm font-bold transition-colors ${
                    activeTab === "HISTORY"
                      ? "bg-white text-navy shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] border-x border-t border-hairline"
                      : "text-muted hover:text-ink hover:bg-paper-deep/50"
                  }`}
                >
                  <History className="size-4.5" />
                  ისტორია & ჩატი
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] ${activeTab === "HISTORY" ? "bg-navy-tint text-navy" : "bg-paper-deep text-muted"}`}>
                    {selectedStudent.assignments.length}
                  </span>
                </button>
              </div>
            </div>

            {/* TAB: ახალი დავალების გაგზავნა */}
            {activeTab === "NEW" && (
              <div className="rounded-3xl border border-hairline bg-white p-6 sm:p-8 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline-soft pb-5 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-full bg-navy-tint text-navy">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-ink">
                        გაუგზავნე დავალება
                      </h3>
                      <p className="text-xs text-muted">შეავსეთ ფორმა ან აირჩიეთ ბანკიდან</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-navy/30 bg-navy-tint/50 px-4 py-2.5 text-xs font-bold text-navy transition-all hover:bg-navy hover:text-white hover:shadow-md"
                  >
                    <FolderOpen className="size-4" />
                    არჩევა ბიბლიოთეკიდან ({availableSetProblems.length})
                  </button>
                </div>

                <form onSubmit={handleSendAssignment} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-xs font-bold text-muted ml-1 uppercase tracking-wider">სათაური / თემა</label>
                      <input
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="მაგ: ლოგარითმული უტოლობები"
                        className="mt-1.5 w-full rounded-2xl border border-hairline bg-paper px-4 py-3 text-sm outline-none transition-colors focus:border-navy focus:bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-muted ml-1 uppercase tracking-wider">ტიპი</label>
                        <select
                          value={type}
                          onChange={(e) => setType(e.target.value as any)}
                          className="mt-1.5 w-full rounded-2xl border border-hairline bg-paper px-4 py-3 text-sm outline-none transition-colors focus:border-navy focus:bg-white"
                        >
                          <option value="FLASHCARD">სასწავლო ბარათი</option>
                          <option value="PROBLEM">ამოცანა / სავარჯიშო</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted ml-1 uppercase tracking-wider">კურსი</label>
                        <select
                          value={courseId}
                          onChange={(e) => setCourseId(e.target.value)}
                          className="mt-1.5 w-full rounded-2xl border border-hairline bg-paper px-4 py-3 text-sm outline-none transition-colors focus:border-navy focus:bg-white"
                        >
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted ml-1 uppercase tracking-wider flex items-center justify-between">
                      <span>ამოცანის პირობა ან ფორმულა (LaTeX)</span>
                    </label>
                    <textarea
                      rows={4}
                      value={problemContent}
                      onChange={(e) => setProblemContent(e.target.value)}
                      placeholder="მაგ: იპოვეთ უდიდესი მთელი ამონახსნი: \log_{\frac{3}{2}}(x^2 - 2x + 9) \ge -2"
                      className="mt-1.5 w-full rounded-2xl border border-hairline bg-paper px-4 py-3 text-sm outline-none transition-colors focus:border-navy focus:bg-white font-mono leading-relaxed resize-y"
                    />
                    {problemContent && (
                      <div className="mt-3 rounded-2xl border border-navy/20 bg-navy-tint/20 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-navy mb-2 flex items-center gap-1.5">
                          <BookOpen className="size-3" /> წინასწარი ნახვა
                        </p>
                        <div className="text-[15px] font-medium text-ink bg-white p-3 rounded-xl border border-hairline-soft">
                          <KatexPreview tex={problemContent} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted ml-1 uppercase tracking-wider">ინსტრუქცია და მითითება მოსწავლისთვის</label>
                    <textarea
                      rows={2}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="მაგ: ყურადღება მიაქციეთ ფუძის მნიშვნელობას..."
                      className="mt-1.5 w-full rounded-2xl border border-hairline bg-paper px-4 py-3 text-sm outline-none transition-colors focus:border-navy focus:bg-white resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-hairline-soft">
                    <button
                      type="submit"
                      disabled={pending || !title.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-navy px-8 py-3.5 text-sm font-bold text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-navy/20 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {pending ? (
                         <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      {pending ? "იგზავნება..." : "დავალების გაგზავნა"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB: ისტორია და ჩატი */}
            {activeTab === "HISTORY" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {selectedStudent.assignments.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-hairline bg-white/50 py-20 text-center backdrop-blur-sm">
                    <Layers className="mx-auto size-12 text-muted/50 mb-3" />
                    <p className="text-sm font-bold text-ink">დავალებები ჯერ არ არის გაგზავნილი</p>
                    <button
                      onClick={() => setActiveTab("NEW")}
                      className="mt-4 text-xs font-bold text-navy hover:underline"
                    >
                      გაგზავნეთ პირველი დავალება →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {selectedStudent.assignments.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col overflow-hidden rounded-3xl border border-hairline bg-white shadow-sm transition-all"
                      >
                        {/* ბარათის ჰედერი და კონტენტი */}
                        <div className="p-6 border-b border-hairline bg-paper/20">
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="rounded-lg bg-navy-tint px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-navy">
                                  {item.type === "FLASHCARD" ? "ბარათი" : "ამოცანა"}
                                </span>
                                <span className="text-[11px] font-semibold text-muted flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {formatDate(item.createdAt)}
                                </span>
                              </div>
                              <h4 className="text-lg font-bold text-ink">{item.title}</h4>
                            </div>
                          </div>

                          {item.customPayload?.text && (
                            <div className="rounded-2xl border border-hairline-soft bg-white p-4 shadow-sm mb-4">
                              <div className="text-[15px] font-medium text-ink leading-relaxed">
                                <KatexPreview tex={item.customPayload.text} />
                              </div>
                            </div>
                          )}

                          {item.instructions && (
                            <div className="rounded-2xl border border-amber-200/50 bg-amber-50/50 p-4">
                              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                                <Info className="size-3.5" /> 
                                თქვენი მითითება:
                              </p>
                              <p className="mt-1.5 text-sm font-medium text-amber-900/80 leading-relaxed">
                                {item.instructions}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* ჩატის სექცია */}
                        <div className="flex flex-col bg-paper/30">
                          <div className="flex items-center gap-2 border-b border-hairline-soft bg-white/50 px-6 py-3">
                            <MessageSquare className="size-4 text-navy" />
                            <h5 className="text-xs font-bold text-ink uppercase tracking-wider">დისკუსია მოწავლესთან</h5>
                            <span className="ml-auto rounded-full bg-paper-deep px-2 py-0.5 text-[10px] font-bold text-muted">
                              {item.comments.length}
                            </span>
                          </div>

                          <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[400px]">
                            {item.comments.length === 0 ? (
                              <div className="text-center py-6 opacity-60">
                                <p className="text-xs font-semibold text-muted">შეტყობინებები არ არის</p>
                              </div>
                            ) : (
                              item.comments.map((c) => {
                                const isTeacher = c.author.role === "TEACHER";
                                return (
                                  <div
                                    key={c.id}
                                    className={`flex flex-col max-w-[85%] ${
                                      isTeacher ? "items-end ml-auto" : "items-start mr-auto"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 mb-1 px-1">
                                      <span className="text-[10px] font-bold text-muted">
                                        {isTeacher ? "თქვენ" : c.author.name}
                                      </span>
                                      <span className="text-[9px] text-muted/60">
                                        {formatTime(c.createdAt)}
                                      </span>
                                    </div>
                                    <div
                                      className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                                        isTeacher
                                          ? "bg-navy text-white rounded-tr-sm"
                                          : "bg-white border border-hairline text-ink rounded-tl-sm"
                                      }`}
                                    >
                                      {c.body}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* ჩატის Input */}
                          <div className="border-t border-hairline bg-white p-4">
                            <div className="relative flex items-end gap-2">
                              <textarea
                                rows={1}
                                value={commentInputs[item.id] || ""}
                                onChange={(e) => {
                                  setCommentInputs({ ...commentInputs, [item.id]: e.target.value });
                                  e.target.style.height = 'auto';
                                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendComment(item.id);
                                  }
                                }}
                                placeholder="მისწერეთ მოსწავლეს..."
                                className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-2xl border border-hairline bg-paper px-4 py-3 text-[13px] outline-none transition-colors focus:border-navy focus:bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleSendComment(item.id)}
                                disabled={commentPending === item.id || !commentInputs[item.id]?.trim()}
                                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-navy text-white transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-50 shadow-sm"
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
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {isPickerOpen && (
        <ProblemPickerModal
          problems={availableSetProblems}
          onSelect={handleSelectProblem}
          onClose={() => setIsPickerOpen(false)}
        />
      )}
    </div>
  );
}