import { BookOpen, KeyRound, Trash2, PenLine } from 'lucide-react';

interface EmptyGroupsStateProps {
  courses: any[];
  openCourseModal: (course: any) => void;
  setDeletingId: (id: string) => void;
}

export function EmptyGroupsState({ courses, openCourseModal, setDeletingId }: EmptyGroupsStateProps) {
  return courses.length === 0 ? (
    <div className="rounded-box border border-dashed border-hairline py-16 text-center text-muted">
      <BookOpen className="mx-auto size-8 opacity-40 mb-3" />
      <p className="text-sm font-bold">ჯგუფები ჯერ არ არის დამატებული</p>
    </div>
  ) : (
    <div className="rounded-box border border-hairline overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-hairline bg-sectionHeader text-xs font-bold uppercase tracking-wider text-muted">
          <tr>
            <th className="px-4 py-3 font-bold">ჯგუფის სახელი</th>
            <th className="px-4 py-3 font-bold">მოსაწვევი კოდი</th>
            <th className="px-4 py-3 font-bold">მასწავლებელი</th>
            <th className="px-4 py-3 font-bold">მოსწავლეები</th>
            <th className="px-4 py-3 font-bold text-right">მოქმედება</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline bg-main">
          {courses.map((course) => (
            <tr key={course.id} className="transition-colors hover:bg-sectionHeader">
              <td className="px-4 py-3 font-bold text-ink">{course.title}</td>
              <td className="px-4 py-3 font-mono text-xs">
                {course.inviteCode ? (
                  <span className="inline-flex items-center gap-1 rounded-box border border-navy/10 bg-navy-tint px-2 py-0.5 font-bold text-navy">
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
                    className="flex size-8 cursor-pointer items-center justify-center rounded-box border border-hairline bg-main text-icons transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText">
                    <PenLine className="size-4" />
                  </button>
                  <button
                    onClick={() => setDeletingId(course.id)}
                    className="flex size-8 cursor-pointer items-center justify-center rounded-box border border-hairline bg-main text-muted transition-all duration-200 hover:border-rose-500/30 hover:bg-rose-500/15 hover:text-rose-500">
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
