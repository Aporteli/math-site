import { BookOpen, KeyRound, Trash2, PenLine } from 'lucide-react';

interface EmptyGroupsStateProps {
  courses: any[];
  openCourseModal: (course: any) => void;
  setDeletingId: (id: string) => void;
}

export function EmptyGroupsState({ courses, openCourseModal, setDeletingId }: EmptyGroupsStateProps) {
  return courses.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-hairline py-16 text-center text-muted">
      <BookOpen className="mx-auto size-8 opacity-40 mb-3" />
      <p className="text-sm font-bold">ჯგუფები ჯერ არ არის დამატებული</p>
    </div>
  ) : (
    <div className="rounded-2xl border border-hairline overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-paper/50 text-xs uppercase tracking-wider text-muted border-b border-hairline">
          <tr>
            <th className="px-4 py-3 font-bold">ჯგუფის სახელი</th>
            <th className="px-4 py-3 font-bold">მოსაწვევი კოდი</th>
            <th className="px-4 py-3 font-bold">მასწავლებელი</th>
            <th className="px-4 py-3 font-bold">მოსწავლეები</th>
            <th className="px-4 py-3 font-bold text-right">მოქმედება</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline bg-white">
          {courses.map((course) => (
            <tr key={course.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-4 py-3 font-bold text-ink">{course.title}</td>
              <td className="px-4 py-3 font-mono text-xs">
                {course.inviteCode ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-navy-tint px-2 py-0.5 font-bold text-navy border border-navy/10">
                    <KeyRound className="size-3" />
                    {course.inviteCode}
                  </span>
                ) : (
                  <span className="text-muted italic text-[11px]">არ აქვს</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted">
                {course.teacher?.name || course.teacher?.email || 'არ არის მინიჭებული'}
              </td>
              <td className="px-4 py-3 font-bold text-navy">{course._count.enrollments}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => openCourseModal(course)}
                    className="flex size-8 items-center justify-center rounded-lg border border-hairline bg-white text-muted hover:text-navy hover:border-navy/30 transition-colors">
                    <PenLine className="size-4" />
                  </button>
                  <button
                    onClick={() => setDeletingId(course.id)}
                    className="flex size-8 items-center justify-center rounded-lg border border-hairline bg-white text-muted hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
