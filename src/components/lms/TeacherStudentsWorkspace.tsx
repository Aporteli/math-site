"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  BookOpen,
  Trash2,
  AlertTriangle,
  Loader2,
  Calendar,
  MessageSquare,
  Plus,
  Send,
  X,
  Check,
  GraduationCap,
  ChevronDown,
} from "lucide-react";
import { deleteTargetedAssignmentAction } from "@/lib/actions/teacher-students";
import { sendProblemToStudentAction } from "@/lib/actions/students";
import { TeacherViewProblemModal } from "@/components/lms/teacher/TeacherViewProblemModal";
import { KatexPreview } from "@/components/math/katex-preview";

interface StudentAssignment {
  id: string;
  title: string;
  type: string;
  instructions?: string | null;
  status: string;
  createdAt: string;
  promptTex?: string;
  comments: {
    id: string;
    body: string;
    createdAt: string;
    author: { name: string; role: string };
  }[];
}

interface StudentItem {
  id: string;
  name: string;
  email?: string;
  imageUrl?: string | null;
  courses: { id: string; title: string }[];
  assignments: StudentAssignment[];
}

interface SetProblem {
  id: string;
  setId: string;
  setTitle: string;
  title: string;
  promptTex: string;
  solutionTex: string;
}

interface TeacherStudentsWorkspaceProps {
  initialStudents: StudentItem[];
  courses: { id: string; title: string }[];
  availableSetProblems: SetProblem[];
}

export function TeacherStudentsWorkspace({
  initialStudents = [],
  courses = [],
  availableSetProblems = [],
}: TeacherStudentsWorkspaceProps) {
  const [students, setStudents] = useState<StudentItem[]>(initialStudents);
  
  // კლასების State (მარცხენა სვეტისთვის)
  const [activeCourseId, setActiveCourseId] = useState<string | "all">("all");
  
  // მოსწავლეების State (მარჯვენა ტაბებისთვის)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // ძებნა კლასებისთვის მარცხენა სვეტში
  const [classSearchQuery, setClassSearchQuery] = useState("");
  
  // თარიღების ჩასაკეცი (Collapsible) State
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});
  
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeAssignmentModal, setActiveAssignmentModal] = useState<{
    assignment: StudentAssignment;
    studentName: string;
  } | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedProblemId, setSelectedProblemId] = useState<string>(
    availableSetProblems?.[0]?.id || ""
  );
  const [assignComment, setAssignComment] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [problemSearchQuery, setProblemSearchQuery] = useState("");

  const isAnyModalOpen = Boolean(deletingAssignmentId || activeAssignmentModal || isAssignModalOpen);

  useEffect(() => {
    if (isAnyModalOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [isAnyModalOpen]);

  // გაფილტვრა კლასების სიისთვის
  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(classSearchQuery.toLowerCase())
  );

  // მოსწავლეები, რომლებიც ეკუთვნიან არჩეულ კლასს (ან ყველანი, თუ "all" არის არჩეული)
  const studentsInActiveCourse = students.filter((s) =>
    activeCourseId === "all" ? true : s.courses.some((c) => c.id === activeCourseId)
  );

  const activeStudent = students.find((s) => s.id === selectedStudentId);
  
  // დავალებების თარიღების მიხედვით დაჯგუფება
  const groupedAssignments = useMemo(() => {
    if (!activeStudent || !activeStudent.assignments) return [];
    
    const groupsMap = new Map<string, { dateObj: Date; items: StudentAssignment[] }>();

    activeStudent.assignments.forEach((assignment) => {
      const dateObj = new Date(assignment.createdAt);
      // თარიღის ფორმატირება, მაგ: "18 აგვისტო, 2026"
      const dateStr = dateObj.toLocaleDateString("ka-GE", { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });

      if (!groupsMap.has(dateStr)) {
        groupsMap.set(dateStr, { dateObj, items: [] });
      }
      groupsMap.get(dateStr)!.items.push(assignment);
    });

    // ვალაგებთ კლებადობით (უახლესიდან უძველესისკენ)
    return Array.from(groupsMap.entries())
      .sort((a, b) => b[1].dateObj.getTime() - a[1].dateObj.getTime())
      .map(([dateStr, data]) => ({
        dateStr,
        items: data.items
      }));
  }, [activeStudent]);

  const selectedProblem = availableSetProblems.find((p) => p.id === selectedProblemId);
  const filteredSetProblems = availableSetProblems.filter(
    (p) =>
      p.title.toLowerCase().includes(problemSearchQuery.toLowerCase()) ||
      p.setTitle.toLowerCase().includes(problemSearchQuery.toLowerCase())
  );

  // კლასის შეცვლისას მოსწავლის განულება
  const handleCourseChange = (courseId: string) => {
    setActiveCourseId(courseId);
    setSelectedStudentId(null);
  };

  const toggleDate = (dateStr: string) => {
    setCollapsedDates(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  async function handleConfirmDelete() {
    if (!deletingAssignmentId) return;

    setIsDeleting(true);
    const res = await deleteTargetedAssignmentAction(deletingAssignmentId);
    setIsDeleting(false);

    if (res.success) {
      setStudents((prev) =>
        prev.map((student) => ({
          ...student,
          assignments: student.assignments.filter((a) => a.id !== deletingAssignmentId),
        }))
      );
      setDeletingAssignmentId(null);
    } else {
      alert(res.error || "წაშლა ვერ მოხერხდა");
    }
  }

  async function handleSendProblemToStudent() {
    if (!activeStudent || !selectedProblemId) return;
    
    const problem = availableSetProblems.find(p => p.id === selectedProblemId);
    if (!problem) return;

    setAssigning(true);
    
    try {
      const res = await sendProblemToStudentAction({
        studentId: activeStudent.id,
        instructions: assignComment.trim() || undefined,
        problem: {
          id: problem.id,
          topic: problem.title,
          difficulty: "medium", 
          promptTex: problem.promptTex,
          solutionTex: problem.solutionTex,
        },
      });

      if (res.success) {
        const newAssignment: StudentAssignment = {
          id: res.assignmentId || "temp-" + Date.now(),
          title: problem.title,
          type: "PROBLEM",
          instructions: assignComment.trim() || null,
          status: "PUBLISHED",
          createdAt: new Date().toISOString(),
          promptTex: problem.promptTex,
          comments: assignComment.trim() ? [{
            id: "cmt-" + Date.now(),
            body: assignComment.trim(),
            createdAt: new Date().toISOString(),
            author: { name: "თქვენ", role: "TEACHER" }
          }] : [],
        };

        setStudents((prev) =>
          prev.map((s) =>
            s.id === activeStudent.id
              ? { ...s, assignments: [newAssignment, ...s.assignments] }
              : s
          )
        );
        setIsAssignModalOpen(false);
        setAssignComment("");
        setProblemSearchQuery("");
      } else {
        alert("გაგზავნა ვერ მოხერხდა: " + (res.error || "უცნობი შეცდომა"));
      }
    } catch (error) {
      console.error(error);
      alert("დაფიქსირდა შეცდომა დავალების გაგზავნისას.");
    } finally {
      setAssigning(false);
    }
  }

  const getStudentCountInCourse = (courseId: string) => {
    return students.filter(s => s.courses.some(c => c.id === courseId)).length;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:h-[calc(100vh-14rem)] lg:min-h-[38rem] lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-stretch">
        
        {/* სვეტი 1: კლასების (კურსების) სია მარცხნივ */}
        <aside className="flex min-h-0 flex-col rounded-3xl border border-hairline bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-hairline pb-3">
            <GraduationCap className="size-4 text-navy" />
            <h3 className="text-sm font-bold text-ink">კლასები</h3>
            <span className="ml-auto rounded-full bg-paper-deep px-2 py-0.5 text-[10px] font-bold text-muted">
              {courses.length}
            </span>
          </div>

          <div className="relative my-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
            <input
              type="text"
              value={classSearchQuery}
              onChange={(e) => setClassSearchQuery(e.target.value)}
              placeholder="მოძებნეთ კლასი..."
              className="w-full rounded-xl border border-hairline bg-paper py-2 pl-9 pr-3 text-xs font-medium text-ink outline-none focus:border-navy"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pe-0.5">
            {/* ყველა მოსწავლის ფილტრი */}
            <button
              type="button"
              onClick={() => handleCourseChange("all")}
              className={`flex w-full items-center justify-between gap-2.5 rounded-2xl p-3 text-left transition-all ${
                activeCourseId === "all"
                  ? "bg-navy text-white shadow-sm ring-1 ring-navy"
                  : "bg-paper/40 hover:bg-paper-deep text-ink"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  activeCourseId === "all" ? "bg-white text-navy" : "bg-navy text-white"
                }`}>
                  <Users className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">ყველა მოსწავლე</p>
                </div>
              </div>
              <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                activeCourseId === "all" ? "bg-white/20 text-white" : "bg-white border border-hairline text-muted"
              }`}>
                {students.length}
              </span>
            </button>

            {/* კონკრეტული კლასები */}
            {filteredCourses.map((course) => {
              const active = course.id === activeCourseId;
              const count = getStudentCountInCourse(course.id);
              
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => handleCourseChange(course.id)}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-2xl p-3 text-left transition-all ${
                    active
                      ? "bg-navy text-white shadow-sm ring-1 ring-navy"
                      : "bg-paper/40 hover:bg-paper-deep text-ink"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      active ? "bg-white text-navy" : "bg-navy text-white"
                    }`}>
                      {course.title.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{course.title}</p>
                    </div>
                  </div>

                  <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                    active ? "bg-white/20 text-white" : "bg-white border border-hairline text-muted"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
            
            {filteredCourses.length === 0 && (
              <p className="py-8 text-center text-xs text-muted">კლასი არ მოიძებნა</p>
            )}
          </div>
        </aside>

        {/* სვეტი 2: მოსწავლეების ტაბები და გაგზავნილი დავალებები */}
        <section className="flex min-h-0 flex-col rounded-3xl border border-hairline bg-white shadow-sm overflow-hidden">
          
          {/* მოსწავლეების ტაბები ბრაუზერის სტილში */}
          <div className="bg-paper/30 border-b border-hairline pt-2 px-2 overflow-x-auto flex custom-scrollbar">
            {studentsInActiveCourse.length === 0 ? (
              <p className="py-3 px-4 text-xs font-bold text-muted">ამ კლასში მოსწავლეები არ არიან</p>
            ) : (
              studentsInActiveCourse.map((student) => {
                const isSelected = selectedStudentId === student.id;
                return (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 rounded-t-xl border-b-2 text-sm transition-all ${
                      isSelected
                        ? "border-navy bg-white text-navy font-bold shadow-[0_-2px_10px_rgba(0,0,0,0.02)]"
                        : "border-transparent text-muted hover:text-ink hover:bg-paper/50 font-medium"
                    }`}
                  >
                    <div className={`flex size-5 items-center justify-center rounded-full text-[9px] font-bold ${
                      isSelected ? "bg-navy text-white" : "bg-paper-deep text-muted"
                    }`}>
                      {student.name.charAt(0)}
                    </div>
                    {student.name}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex-1 flex flex-col min-h-0 p-5">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div>
                <h3 className="text-base font-bold text-ink">
                  {activeStudent ? activeStudent.name : "აირჩიეთ მოსწავლე ტაბიდან"}
                </h3>
                <p className="text-xs text-muted mt-0.5">გაგზავნილი ინდივიდუალური ბარათები და დავალებები</p>
              </div>
              
              {activeStudent && (
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-navy-strong transition-all shadow-sm active:scale-95"
                >
                  <Plus className="size-4" />
                  <span>ბარათის მიმაგრება</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pt-5 pe-1">
              {!activeStudent ? (
                <div className="py-20 flex flex-col items-center justify-center text-center text-muted">
                  <Users className="size-10 opacity-30 mb-2" />
                  <p className="text-sm font-bold text-ink">მოსწავლე არ არის არჩეული</p>
                  <p className="text-xs max-w-xs mt-1">აირჩიეთ მოსწავლე ზედა ტაბებიდან, რათა ნახოთ ან გაუგზავნოთ დავალებები.</p>
                </div>
              ) : !activeStudent.assignments || activeStudent.assignments.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center text-muted">
                  <BookOpen className="size-10 opacity-30 mb-2" />
                  <p className="text-sm font-bold text-ink">ბარათები არ არის გაგზავნილი</p>
                  <p className="text-xs max-w-xs mt-1">ამ მოსწავლეს ჯერ არ აქვს მინიჭებული ინდივიდუალური დავალება.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedAssignments.map(({ dateStr, items }) => {
                    const isCollapsed = collapsedDates[dateStr];

                    return (
                      <div key={dateStr} className="space-y-4">
                        {/* ჩასაკეცი სათაური (თარიღი) */}
                        <div 
                          className="flex items-center gap-3 cursor-pointer group select-none"
                          onClick={() => toggleDate(dateStr)}
                        >
                          <div className="flex items-center gap-2 rounded-xl bg-paper px-3 py-1.5 border border-hairline-soft transition-colors group-hover:bg-paper-deep">
                            <Calendar className="size-3.5 text-muted" />
                            <span className="text-xs font-bold text-ink">{dateStr}</span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-muted border border-hairline-soft">
                              {items.length}
                            </span>
                            <ChevronDown className={`size-3.5 text-muted transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} />
                          </div>
                          <div className="h-px flex-1 bg-hairline-soft"></div>
                        </div>

                        {/* ბარათების გრიდი */}
                        {!isCollapsed && (
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {items.map((assignment) => (
                              <div
                                key={assignment.id}
                                onClick={() => {
                                  setActiveAssignmentModal({
                                    assignment,
                                    studentName: activeStudent.name,
                                  });
                                }}
                                className="flex flex-col justify-between gap-4 rounded-2xl border border-hairline bg-white p-4 transition-all hover:border-navy/40 hover:shadow-md cursor-pointer group"
                              >
                                <div className="flex flex-col gap-2 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="rounded-lg bg-navy-tint px-2.5 py-0.5 text-[10px] font-bold text-navy border border-navy/10">
                                      {assignment.type}
                                    </span>
                                    {assignment.comments && assignment.comments.length > 0 && (
                                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                                        <MessageSquare className="size-3" />
                                        {assignment.comments.length}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <h4 className="text-sm font-bold text-ink group-hover:text-navy transition-colors line-clamp-2 leading-snug">
                                    {assignment.title}
                                  </h4>
                                  
                                  {assignment.instructions && (
                                    <div className="mt-1 rounded-lg bg-amber-50/50 p-2.5 border border-amber-100/50">
                                       <p className="text-xs text-amber-900/70 line-clamp-2">
                                         <span className="font-bold text-amber-800/80 mr-1">შენიშვნა:</span>
                                         {assignment.instructions}
                                       </p>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between mt-2 pt-3 border-t border-hairline-soft">
                                  <span className="text-xs font-bold text-navy group-hover:underline flex items-center gap-1">
                                    სრულად ნახვა <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                  </span>

                                  <button
                                    type="button"
                                    title="დავალების წაშლა"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingAssignmentId(assignment.id);
                                    }}
                                    className="flex size-8 items-center justify-center rounded-lg border border-hairline bg-white text-muted hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-xs"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ბარათის მიმაგრების მოდალი */}
      {isAssignModalOpen && activeStudent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !assigning && setIsAssignModalOpen(false)}
        >
          <div 
            className="flex h-[85vh] max-h-[720px] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-hairline bg-gradient-to-b from-paper/60 to-white px-6 py-5">
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-navy/10 bg-navy-tint text-navy">
                  <BookOpen className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-ink leading-tight">
                    ბარათის გაგზავნა
                  </h3>
                  <p className="text-sm text-muted mt-0.5 truncate">
                    მიმღები: <span className="font-bold text-ink">{activeStudent.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-hairline bg-white text-muted shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                <X className="size-5" />
              </button>
            </div>

            {availableSetProblems.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center">
                <BookOpen className="size-9 text-muted/40" />
                <p className="text-sm font-bold text-ink">ხელმისაწვდომი ბარათები არ მოიძებნა</p>
                <p className="text-xs text-muted max-w-xs">დაამატეთ ამოცანა კრებულში, რომ აქედან გააგზავნოთ.</p>
              </div>
            ) : (
              <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
                <div className="flex min-h-0 shrink-0 flex-col border-b border-hairline bg-paper/40 lg:w-[300px] lg:border-b-0 lg:border-r">
                  <div className="flex items-center justify-between border-b border-hairline/70 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="size-3.5 text-navy" />
                      <label className="text-xs font-bold uppercase tracking-wider text-muted">
                        აირჩიეთ ბარათი
                      </label>
                    </div>
                    <span className="rounded-full bg-white border border-hairline px-2 py-0.5 text-[10px] font-bold text-muted">
                      {availableSetProblems.length}
                    </span>
                  </div>

                  <div className="px-3 pt-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
                      <input
                        type="text"
                        value={problemSearchQuery}
                        onChange={(e) => setProblemSearchQuery(e.target.value)}
                        placeholder="მოძებნეთ ბარათი..."
                        className="w-full rounded-xl border border-hairline bg-white py-2 pl-9 pr-3 text-xs font-medium text-ink outline-none transition-colors focus:border-navy"
                      />
                    </div>
                  </div>

                  <div className="max-h-[220px] flex-1 space-y-1.5 overflow-y-auto p-3 custom-scrollbar lg:max-h-none">
                    {filteredSetProblems.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted">ბარათი არ მოიძებნა</p>
                    ) : (
                      filteredSetProblems.map((prob) => {
                        const isSelected = selectedProblemId === prob.id;
                        return (
                          <button
                            key={prob.id}
                            type="button"
                            onClick={() => setSelectedProblemId(prob.id)}
                            className={`group/item flex w-full items-start gap-2.5 rounded-xl border-l-[3px] py-2.5 pl-3 pr-2.5 text-left transition-all ${
                              isSelected
                                ? "border-l-navy bg-white shadow-sm ring-1 ring-navy/15"
                                : "border-l-transparent bg-white/60 hover:border-l-navy/30 hover:bg-white"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                                isSelected ? 'bg-navy text-white border-navy' : 'bg-paper text-navy border-hairline'
                              }`}>
                                {prob.setTitle}
                              </span>
                              <p className={`mt-1.5 truncate text-sm font-bold ${isSelected ? "text-navy" : "text-ink"}`}>
                                {prob.title}
                              </p>
                            </div>
                            <div className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              isSelected
                                ? "border-navy bg-navy"
                                : "border-hairline bg-white opacity-0 group-hover/item:opacity-100"
                            }`}>
                              {isSelected && <Check className="size-2.5 text-white" strokeWidth={3} />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
                  {selectedProblem && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-md bg-navy text-white text-[10px] font-bold uppercase px-2.5 py-1 border border-navy">
                          {selectedProblem.setTitle}
                        </span>
                        <h4 className="text-base font-bold text-ink">{selectedProblem.title}</h4>
                      </div>
                      <div className="rounded-2xl border border-hairline-soft bg-slate-50/60 p-5 overflow-x-auto">
                        <KatexPreview 
                          tex={selectedProblem.promptTex} 
                          className="text-ink text-base leading-relaxed" 
                        />
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl bg-amber-50/40 p-5 border border-amber-200/60 shadow-inner">
                    <label className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                      <MessageSquare className="size-4" />
                      მასწავლებლის შენიშვნა / ინსტრუქცია (არასავალდებულო)
                    </label>
                    <textarea
                      value={assignComment}
                      onChange={(e) => setAssignComment(e.target.value)}
                      placeholder="ჩაწერეთ დამატებითი მითითებები ამ ამოცანისთვის..."
                      className="w-full resize-none rounded-xl border border-amber-200 bg-white p-4 text-sm text-ink outline-none transition-shadow placeholder:text-amber-900/30 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-hairline bg-white px-6 py-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)]">
              <button
                type="button"
                disabled={assigning}
                onClick={() => setIsAssignModalOpen(false)}
                className="w-full sm:w-auto rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-ink border border-hairline hover:bg-paper transition-colors disabled:opacity-50"
              >
                გაუქმება
              </button>
              <button
                type="button"
                disabled={assigning || availableSetProblems.length === 0}
                onClick={handleSendProblemToStudent}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-6 py-2.5 text-sm font-bold text-white hover:bg-navy-strong disabled:opacity-50 transition-all shadow-md active:scale-95"
              >
                {assigning ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>იგზავნება...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    <span>ბარათის გაგზავნა</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* მხოლოდ ამოცანის პირობის საჩვენებელი მოდალი */}
      {activeAssignmentModal && (
        <TeacherViewProblemModal
          assignment={{
            title: activeAssignmentModal.assignment.title,
            type: activeAssignmentModal.assignment.type,
            promptTex: activeAssignmentModal.assignment.promptTex || activeAssignmentModal.assignment.instructions || "",
          }}
          studentName={activeAssignmentModal.studentName}
          onClose={() => setActiveAssignmentModal(null)}
        />
      )}

      {/* წაშლის დადასტურების მოდალი */}
      {deletingAssignmentId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => !isDeleting && setDeletingAssignmentId(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-hairline bg-white p-6 shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-ink">დავალების წაშლა</h4>
                <p className="text-xs text-muted mt-0.5">ეს ქმედება შეუქცევადია</p>
              </div>
            </div>

            <p className="mt-4 rounded-xl border border-rose-100/80 bg-rose-50/50 p-3 text-sm leading-relaxed text-muted">
              დარწმუნებული ხართ, რომ გსურთ ამ ბარათის წაშლა? წაიშლება მოსწავლის პასუხები და კომენტარებიც.
            </p>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingAssignmentId(null)}
                className="w-full sm:w-auto rounded-xl border border-hairline bg-white px-4 py-2.5 text-sm font-bold text-ink hover:bg-paper transition-colors disabled:opacity-50"
              >
                გაუქმება
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition-all shadow-sm active:scale-95"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>იშლება...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" />
                    <span>დიახ, წაშლა</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}