'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users, Search, BookOpen, Loader2, GraduationCap, Clock, Calendar, ChevronDown } from 'lucide-react';
import { getTeacherHomeworkSubmissionsAction, type StudentHomeworkGroup } from '@/lib/actions/teacher-homework';
import { TeacherSubmissionReviewModal } from '@/components/lms/teacher/TeacherSubmissionReviewModal';

export function TeacherHomeworkWorkspace() {
  const [data, setData] = useState<StudentHomeworkGroup[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | 'all'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // ჩასაკეცი თარიღების State
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});

  const [activeReviewSubmission, setActiveReviewSubmission] = useState<{
    submission: StudentHomeworkGroup['submissions'][0];
    studentName: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const res = await getTeacherHomeworkSubmissionsAction();
      if (isMounted) {
        setData(res);
        setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // კურსების (კლასების) უნიკალური სიის ფორმირება
  const courses = useMemo(() => {
    const courseMap = new Map<string, string>();
    data.forEach((g) => {
      g.submissions.forEach((sub) => {
        if (sub.assignment?.courseTitle) {
          courseMap.set(sub.assignment.courseTitle, sub.assignment.courseTitle);
        }
      });
    });
    return Array.from(courseMap.keys()).map((title) => ({
      id: title,
      title,
    }));
  }, [data]);

  // კლასების გაფილტვრა ძებნის მიხედვით
  const filteredCourses = courses.filter((c) => c.title.toLowerCase().includes(classSearchQuery.toLowerCase()));

  // მოსწავლეები, რომლებიც ეკუთვნიან არჩეულ კლასს (ან ყველანი)
  const studentsInActiveCourse = useMemo(() => {
    if (activeCourseId === 'all') return data;
    return data.filter((g) => g.submissions.some((s) => s.assignment?.courseTitle === activeCourseId));
  }, [data, activeCourseId]);

  const activeGroup = data.find((g) => g.student.id === selectedStudentId);

  // დამხმარე ფუნქცია: აქვს თუ არა მოსწავლეს შესამოწმებელი დავალება
  const hasPendingSubmissions = (studentGroup: StudentHomeworkGroup) => {
    return studentGroup.submissions.some(
      (s) => (s.status === 'SUBMITTED' || Boolean(s.attachmentUrl)) && !s.grade
    );
  };

  // დამხმარე ფუნქცია: აქვს თუ არა მთლიან კლასს შესამოწმებელი დავალება
  const courseHasPendingSubmissions = (courseTitle: string) => {
    return data
      .filter((g) => g.submissions.some((s) => s.assignment?.courseTitle === courseTitle))
      .some((g) => hasPendingSubmissions(g));
  };

  // დავალებების თარიღების მიხედვით დაჯგუფება
  const groupedSubmissions = useMemo(() => {
    if (!activeGroup || !activeGroup.submissions) return [];
    
    const groupsMap = new Map<string, { dateObj: Date; subs: typeof activeGroup.submissions }>();

    activeGroup.submissions.forEach((sub: any) => {
      const dateValue = sub.submittedAt || sub.createdAt || sub.assignment?.createdAt;
      const dateObj = dateValue ? new Date(dateValue) : new Date();
      
      const dateStr = dateObj.toLocaleDateString("ka-GE", { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });

      if (!groupsMap.has(dateStr)) {
        groupsMap.set(dateStr, { dateObj, subs: [] });
      }
      groupsMap.get(dateStr)!.subs.push(sub);
    });

    return Array.from(groupsMap.entries())
      .sort((a, b) => b[1].dateObj.getTime() - a[1].dateObj.getTime())
      .map(([dateStr, data]) => ({
        dateStr,
        subs: data.subs
      }));
  }, [activeGroup]);

  const handleCourseChange = (courseId: string) => {
    setActiveCourseId(courseId);
    setSelectedStudentId(null);
  };

  const getStudentCountInCourse = (courseTitle: string) => {
    return data.filter((g) => g.submissions.some((s) => s.assignment?.courseTitle === courseTitle)).length;
  };

  const toggleDate = (dateStr: string) => {
    setCollapsedDates(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
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
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-muted">
                <Loader2 className="size-5 animate-spin text-navy" />
                <span>იტვირთება...</span>
              </div>
            ) : (
              <>
                {/* ყველა მოსწავლის ღილაკი */}
                <button
                  type="button"
                  onClick={() => handleCourseChange('all')}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-2xl p-3 text-left transition-all ${
                    activeCourseId === 'all'
                      ? 'bg-navy text-white shadow-sm ring-1 ring-navy'
                      : 'bg-paper/40 hover:bg-paper-deep text-ink'
                  }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        activeCourseId === 'all' ? 'bg-white text-navy' : 'bg-navy text-white'
                      }`}>
                      <Users className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex items-center gap-2">
                      <p className="truncate text-sm font-bold">ყველა მოსწავლე</p>
                      {/* ინდიკატორი მთლიანი სიისთვის */}
                      {/* {data.some((g) => hasPendingSubmissions(g)) && (
                        <span className="size-2 rounded-full bg-amber-500 shrink-0" title="ახალი შესამოწმებელი დავალება" />
                      )} */}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                      activeCourseId === 'all' ? 'bg-white/20 text-white' : 'bg-white border border-hairline text-muted'
                    }`}>
                    {data.length}
                  </span>
                </button>

                {/* კონკრეტული კლასები */}
                {filteredCourses.map((course) => {
                  const active = course.id === activeCourseId;
                  const count = getStudentCountInCourse(course.title);
                  const hasPending = courseHasPendingSubmissions(course.title);

                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => handleCourseChange(course.id)}
                      className={`flex w-full items-center justify-between gap-2.5 rounded-2xl p-3 text-left transition-all ${
                        active
                          ? 'bg-navy text-white shadow-sm ring-1 ring-navy'
                          : 'bg-paper/40 hover:bg-paper-deep text-ink'
                      }`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            active ? 'bg-white text-navy' : 'bg-navy text-white'
                          }`}>
                          {course.title.charAt(0)}
                        </div>
                        <div className="min-w-0 flex items-center gap-2">
                          <p className="truncate text-sm font-bold">{course.title}</p>
                          {/* ინდიკატორი კონკრეტული კლასისთვის */}
                          {hasPending && (
                            <span className={`size-2 rounded-full shrink-0 ${active ? 'bg-amber-300' : 'bg-amber-500'}`} title="ახალი შესამოწმებელი დავალება" />
                          )}
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                          active ? 'bg-white/20 text-white' : 'bg-white border border-hairline text-muted'
                        }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}

                {filteredCourses.length === 0 && courses.length > 0 && (
                  <p className="py-8 text-center text-xs text-muted">კლასი არ მოიძებნა</p>
                )}
              </>
            )}
          </div>
        </aside>

        {/* სვეტი 2: მოსწავლეების ტაბები და გამოგზავნილი დავალებები */}
        <section className="flex min-h-0 flex-col rounded-3xl border border-hairline bg-white shadow-sm overflow-hidden">
          
          {/* მოსწავლეების ტაბები ბრაუზერის სტილში */}
          <div className="bg-paper/30 border-b border-hairline pt-2 px-2 overflow-x-auto flex custom-scrollbar">
            {studentsInActiveCourse.length === 0 ? (
              <p className="py-3 px-4 text-xs font-bold text-muted">ამ კლასში მოსწავლეები არ არიან</p>
            ) : (
              studentsInActiveCourse.map((g) => {
                const isSelected = selectedStudentId === g.student.id;
                const hasPending = hasPendingSubmissions(g);

                return (
                  <button
                    key={g.student.id}
                    onClick={() => setSelectedStudentId(g.student.id)}
                    className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 rounded-t-xl border-b-2 text-sm transition-all ${
                      isSelected
                        ? 'border-navy bg-white text-navy font-bold shadow-[0_-2px_10px_rgba(0,0,0,0.02)]'
                        : 'border-transparent text-muted hover:text-ink hover:bg-paper/50 font-medium'
                    }`}>
                    <div
                      className={`flex size-5 items-center justify-center rounded-full text-[9px] font-bold ${
                        isSelected ? 'bg-navy text-white' : 'bg-paper-deep text-muted'
                      }`}>
                      {g.student.name.charAt(0)}
                    </div>
                    <span>{g.student.name}</span>
                    {hasPending && (
                      <span className="size-2 rounded-full bg-amber-500" title="ახალი შესამოწმებელი დავალება" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex-1 flex flex-col min-h-0 p-5">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div>
                <h3 className="text-base font-bold text-ink">
                  {activeGroup ? activeGroup.student.name : 'აირჩიეთ მოსწავლე ტაბიდან'}
                </h3>
                <p className="text-xs text-muted mt-0.5">გამოგზავნილი დავალებების ჩამონათვალი</p>
              </div>
              {activeGroup && (
                <span className="rounded-full bg-navy-tint px-3 py-1 text-xs font-bold text-navy">
                  სულ: {activeGroup.submissions.length}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pt-5 pe-1">
              {!activeGroup ? (
                <div className="py-20 flex flex-col items-center justify-center text-center text-muted">
                  <Users className="size-10 opacity-30 mb-2" />
                  <p className="text-sm font-bold text-ink">მოსწავლე არ არის არჩეული</p>
                  <p className="text-xs max-w-xs mt-1">
                    აირჩიეთ მოსწავლე ზედა ტაბებიდან, რათა შეამოწმოთ გამოგზავნილი დავალებები.
                  </p>
                </div>
              ) : activeGroup.submissions.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center text-muted">
                  <BookOpen className="size-10 opacity-30 mb-2" />
                  <p className="text-sm font-bold text-ink">დავალებები არ არის</p>
                  <p className="text-xs max-w-xs mt-1">ამ სტუდენტს ჯერ არ აქვს გამოგზავნილი ამოხსნა.</p>
                </div>
              ) : (
                /* დავალებები დაჯგუფებული თარიღების მიხედვით */
                <div className="space-y-6">
                  {groupedSubmissions.map(({ dateStr, subs }) => {
                    const isCollapsed = collapsedDates[dateStr];

                    return (
                      <div key={dateStr} className="space-y-4">
                        {/* ჩასაკეცი სათაური */}
                        <div 
                          className="flex items-center gap-3 cursor-pointer group select-none"
                          onClick={() => toggleDate(dateStr)}
                        >
                          <div className="flex items-center gap-2 rounded-xl bg-paper px-3 py-1.5 border border-hairline-soft transition-colors group-hover:bg-paper-deep">
                            <Calendar className="size-3.5 text-muted" />
                            <span className="text-xs font-bold text-ink">{dateStr}</span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-muted border border-hairline-soft">
                              {subs.length}
                            </span>
                            <ChevronDown className={`size-3.5 text-muted transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} />
                          </div>
                          <div className="h-px flex-1 bg-hairline-soft"></div>
                        </div>

                        {/* დავალებების ბადე */}
                        {!isCollapsed && (
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {subs.map((sub: any) => {
                              const isGraded = Boolean(sub.grade);
                              const isSubmitted = sub.status === 'SUBMITTED' || Boolean(sub.attachmentUrl);

                              return (
                                <div
                                  key={sub.id}
                                  onClick={() =>
                                    setActiveReviewSubmission({
                                      submission: sub,
                                      studentName: activeGroup.student.name,
                                    })
                                  }
                                  className="flex flex-col justify-between gap-4 rounded-2xl border border-hairline bg-white p-4 transition-all hover:border-navy/40 hover:shadow-md cursor-pointer group">
                                  <div className="flex flex-col gap-2 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="rounded-lg bg-navy-tint px-2.5 py-0.5 text-[10px] font-bold text-navy border border-navy/10">
                                        {sub.assignment.courseTitle}
                                      </span>

                                      {sub.assignment.difficulty && (
                                        <span className="rounded-lg bg-paper-deep px-2 py-0.5 text-[10px] font-bold text-muted">
                                          {sub.assignment.difficulty}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-sm font-bold text-ink group-hover:text-navy transition-colors line-clamp-2 leading-snug">
                                      {sub.assignment.title}
                                    </h4>
                                  </div>

                                  <div className="flex items-center justify-between mt-2 pt-3 border-t border-hairline-soft">
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
                                        <span>შესასრულებელი</span>
                                      </div>
                                    )}

                                    <span className="text-xs font-bold text-navy group-hover:underline flex items-center gap-1">
                                      შემოწმება <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
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
                    ? { ...s, status: 'GRADED', grade: { score, comment } }
                    : s,
                ),
              })),
            );
          }}
        />
      )}
    </div>
  );
}