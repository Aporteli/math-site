import type { StudentRecord } from '../../studentList.types';

export function filterStudents(
  students: StudentRecord[],
  query: string,
  activeGroupId: string | 'all',
  showTodayOnly: boolean,
  todayDayOfWeek: number,
) {
  const q = query.trim().toLowerCase();

  return students.filter((s) => {
    const matchesQuery =
      !q ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      (s.parentPhone?.includes(q) ?? false) ||
      (s.email?.toLowerCase().includes(q) ?? false);

    const matchesGroup = activeGroupId === 'all' || s.groupIds.includes(activeGroupId);

    const matchesToday = !showTodayOnly || s.lessons.some((lesson) => lesson.dayOfWeek === todayDayOfWeek);

    return matchesQuery && matchesGroup && matchesToday;
  });
}
