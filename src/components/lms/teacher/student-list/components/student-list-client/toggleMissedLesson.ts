import { toggleMissedLessonAction } from '@/components/lms/teacher/student-list/actions';
import { applyMissedLesson } from './applyMissedLesson';
import type { SetStudents } from './types';

export async function toggleMissedLesson(input: {
  studentId: string;
  lessonId: string;
  date: string;
  missed: boolean;
  setStudents: SetStudents;
}): Promise<void> {
  const { studentId, lessonId, date, missed, setStudents } = input;

  setStudents((prev) => prev.map((s) => applyMissedLesson(s, studentId, lessonId, date, missed)));

  const res = await toggleMissedLessonAction({
    studentId,
    lessonId,
    date,
    missed,
  });
  if (!res.ok) {
    setStudents((prev) => prev.map((s) => applyMissedLesson(s, studentId, lessonId, date, !missed)));
    console.error('[toggleMissed]', res.error);
  }
}
