import type { MissedLesson, StudentRecord } from '../../studentList.types';

export function applyMissedLesson(
  student: StudentRecord,
  studentId: string,
  lessonId: string,
  date: string,
  missed: boolean,
): StudentRecord {
  if (student.id !== studentId) return student;
  const current = student.missedLessons ?? [];
  const filtered = current.filter((x) => !(x.lessonId === lessonId && x.date === date));
  const next: MissedLesson[] = missed ? [...filtered, { lessonId, date }] : filtered;
  return { ...student, missedLessons: next };
}
