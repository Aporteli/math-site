"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  BookOpen,
  Loader2,
  GraduationCap,
  Clock,
} from "lucide-react";
import {
  getTeacherHomeworkSubmissionsAction,
  type StudentHomeworkGroup,
} from "@/lib/actions/teacher-homework";
import { TeacherSubmissionReviewModal } from "@/components/lms/teacher/TeacherSubmissionReviewModal";

export function TeacherHomeworkWorkspace() {
  const [data, setData] = useState<StudentHomeworkGroup[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [activeReviewSubmission, setActiveReviewSubmission] = useState<{
    submission: StudentHomeworkGroup["submissions"][0];
    studentName: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const res = await getTeacherHomeworkSubmissionsAction();
      if (isMounted) {
        setData(res);
        if (res.length > 0) {
          setSelectedStudentId(res[0].student.id);
        }
        setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredData = data.filter(
    (g) =>
      g.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.student.email && g.student.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeGroup = data.find((g) => g.student.id === selectedStudentId);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:h-[calc(100vh-14rem)] lg:min-h-[38rem] lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-stretch">
        
        {/* სვეტი 1: ყველა სტუდენტის დინამიური სია */}
        <aside className="flex min-h-0 flex-col rounded-3xl border border-hairline bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-hairline pb-3">
            <Users className="size-4 text-navy" />
            <h3 className="text-sm font-bold text-ink">სტუდენტები</h3>
            <span className="ml-auto rounded-full bg-paper-deep px-2 py-0.5 text-[10px] font-bold text-muted">
              {data.length}
            </span>
          </div>

          <div className="relative my-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="მოძებნეთ სტუდენტი..."
              className="w-full rounded-xl border border-hairline bg-paper py-2 pl-9 pr-3 text-xs font-medium text-ink outline-none focus:border-navy"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pe-0.5">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-muted">
                <Loader2 className="size-5 animate-spin text-navy" />
                <span>იტვირთება...</span>
              </div>
            ) : filteredData.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted">სტუდენტები არ მოიძებნა</p>
            ) : (
              filteredData.map((g) => {
                const active = g.student.id === selectedStudentId;
                const submittedCount = g.submissions.filter(
                  (s) => s.status === "SUBMITTED" || Boolean(s.attachmentUrl)
                ).length;

                return (
                  <button
                    key={g.student.id}
                    type="button"
                    onClick={() => setSelectedStudentId(g.student.id)}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-2xl p-3 text-left transition-all ${
                      active
                        ? "bg-navy text-white shadow-sm"
                        : "bg-paper/40 hover:bg-paper-deep text-ink"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          active ? "bg-white text-navy" : "bg-navy text-white"
                        }`}
                      >
                        {g.student.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold">{g.student.name}</p>
                        {g.student.email && (
                          <p
                            className={`truncate text-[10px] ${
                              active ? "text-white/70" : "text-muted"
                            }`}
                          >
                            {g.student.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-white border border-hairline text-muted"
                      }`}
                    >
                      {submittedCount}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* სვეტი 2: არჩეული სტუდენტის გამოგზავნილი ამოცანების სია */}
        <section className="flex min-h-0 flex-col rounded-3xl border border-hairline bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-hairline pb-4">
            <div>
              <h3 className="text-base font-bold text-ink">
                {activeGroup ? activeGroup.student.name : "სტუდენტი"}
              </h3>
              <p className="text-xs text-muted">გამოგზავნილი დავალებების ჩამონათვალი</p>
            </div>
            {activeGroup && (
              <span className="rounded-full bg-navy-tint px-3 py-1 text-xs font-bold text-navy">
                სულ: {activeGroup.submissions.length}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pt-4 space-y-3 pe-1">
            {!activeGroup || activeGroup.submissions.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center text-muted">
                <BookOpen className="size-10 opacity-30 mb-2" />
                <p className="text-sm font-bold text-ink">დავალებები არ არის</p>
                <p className="text-xs max-w-xs mt-1">ამ სტუდენტს ჯერ არ აქვს გამოგზავნილი ამოხსნა.</p>
              </div>
            ) : (
              activeGroup.submissions.map((sub) => {
                const isGraded = Boolean(sub.grade);
                const isSubmitted = sub.status === "SUBMITTED" || Boolean(sub.attachmentUrl);

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() =>
                      setActiveReviewSubmission({
                        submission: sub,
                        studentName: activeGroup.student.name,
                      })
                    }
                    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-hairline bg-paper/30 p-4 text-left hover:border-navy/30 hover:bg-white transition-all group"
                  >
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-navy-tint px-2 py-0.5 text-[10px] font-bold text-navy">
                          {sub.assignment.courseTitle}
                        </span>
                        {sub.assignment.difficulty && (
                          <span className="rounded-lg bg-paper-deep px-2 py-0.5 text-[10px] font-bold text-muted">
                            {sub.assignment.difficulty}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-ink group-hover:text-navy transition-colors truncate">
                        {sub.assignment.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isGraded ? (
                        <div className="flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700">
                          <GraduationCap className="size-3.5" />
                          <span>{sub.grade?.score} / 10</span>
                        </div>
                      ) : isSubmitted ? (
                        <div className="flex items-center gap-1 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-800">
                          <Clock className="size-3.5" />
                          <span>შესამოწმებელია</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 rounded-xl bg-paper-deep px-3 py-1.5 text-xs font-bold text-muted">
                          <span>დაუწყებელი</span>
                        </div>
                      )}

                      <span className="text-xs font-bold text-navy group-hover:underline">
                        შემოწმება →
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>

      {activeReviewSubmission && (
        <TeacherSubmissionReviewModal
          submission={activeReviewSubmission.submission}
          studentName={activeReviewSubmission.studentName}
          onClose={() => setActiveReviewSubmission(null)}
          onGraded={(score, comment) => {
            setData((prev) =>
              prev.map((g) => ({
                ...g,
                submissions: g.submissions.map((s) =>
                  s.id === activeReviewSubmission.submission.id
                    ? { ...s, status: "GRADED", grade: { score, comment } }
                    : s
                ),
              }))
            );
          }}
        />
      )}
    </div>
  );
}