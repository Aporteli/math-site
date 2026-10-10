import {
  addIndividualLessonAction,
  addLessonSlotAction,
  deleteIndividualLessonAction,
  deleteLessonSlotAction,
} from '@/components/lms/teacher/student-list/actions';
import type { StudentRecord } from '../../studentList.types';
import type { ActionResult, LessonInput } from './types';

interface LessonHandlerContext {
  students: StudentRecord[];
  studentsRef: { current: StudentRecord[] };
  updateStudent: (id: string, patch: Partial<StudentRecord>) => void;
}

export async function addStudentLesson(input: LessonInput, ctx: LessonHandlerContext): Promise<ActionResult> {
  const { students, studentsRef, updateStudent } = ctx;
  const student = students.find((s) => s.id === input.studentId);
  const isIndividual = student?.kind === 'individual';

  if (isIndividual) {
    const res = await addIndividualLessonAction({
      studentId: input.studentId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
    });
    if (!res.ok) return { ok: false, error: res.error };

    const homeGroupId = studentsRef.current.find((s) => s.id === input.studentId)?.homeGroupId ?? '';
    const copies = res.copies.length > 0 ? res.copies : [{ studentId: input.studentId, lessonId: res.id }];

    for (const copy of copies) {
      const current = studentsRef.current.find((s) => s.id === copy.studentId);
      if (
        current?.lessons.some(
          (l) =>
            l.id === copy.lessonId ||
            (l.dayOfWeek === input.dayOfWeek && l.startTime === input.startTime && l.endTime === input.endTime),
        )
      ) {
        continue;
      }
      updateStudent(copy.studentId, {
        lessons: [
          ...(current?.lessons ?? []),
          {
            id: copy.lessonId,
            dayOfWeek: input.dayOfWeek,
            startTime: input.startTime,
            endTime: input.endTime,
            groupId: homeGroupId,
          },
        ],
      });
    }
    return { ok: true };
  }

  const res = await addLessonSlotAction(input);
  if (!res.ok) return { ok: false, error: res.error };

  const copies = res.copies.length > 0 ? res.copies : [{ studentId: input.studentId, lessonId: res.id }];

  for (const copy of copies) {
    const current = studentsRef.current.find((s) => s.id === copy.studentId);
    if (
      current?.lessons.some(
        (l) =>
          l.id === copy.lessonId ||
          (l.groupId === input.groupId &&
            l.dayOfWeek === input.dayOfWeek &&
            l.startTime === input.startTime &&
            l.endTime === input.endTime),
      )
    ) {
      continue;
    }
    updateStudent(copy.studentId, {
      lessons: [
        ...(current?.lessons ?? []),
        {
          id: copy.lessonId,
          dayOfWeek: input.dayOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
          groupId: input.groupId,
        },
      ],
    });
  }
  return { ok: true };
}

export async function deleteStudentLesson(lessonId: string, ctx: LessonHandlerContext): Promise<ActionResult> {
  const { students, studentsRef, updateStudent } = ctx;

  let lessonOwner: StudentRecord | undefined;
  for (const s of students) {
    if (s.lessons.some((l) => l.id === lessonId)) {
      lessonOwner = s;
      break;
    }
  }

  const isIndividual = lessonOwner?.kind === 'individual';

  if (isIndividual) {
    const res = await deleteIndividualLessonAction({ lessonId });
    if (!res.ok) return { ok: false, error: res.error };

    if (res.match) {
      const { groupId, dayOfWeek, startTime, endTime } = res.match;
      for (const owner of studentsRef.current) {
        if (owner.homeGroupId !== groupId) continue;
        const next = owner.lessons.filter(
          (l) => !(l.dayOfWeek === dayOfWeek && l.startTime === startTime && l.endTime === endTime),
        );
        if (next.length !== owner.lessons.length) {
          updateStudent(owner.id, { lessons: next });
        }
      }
      return { ok: true };
    }

    const owner = studentsRef.current.find((s) => s.lessons.some((l) => l.id === lessonId));
    if (owner) {
      updateStudent(owner.id, {
        lessons: owner.lessons.filter((l) => l.id !== lessonId),
      });
    }
    return { ok: true };
  }

  const res = await deleteLessonSlotAction({ lessonId });
  if (!res.ok) return { ok: false, error: res.error };

  const { groupId, dayOfWeek, startTime, endTime } = res.match;
  for (const owner of studentsRef.current) {
    const next = owner.lessons.filter(
      (l) =>
        !(l.groupId === groupId && l.dayOfWeek === dayOfWeek && l.startTime === startTime && l.endTime === endTime),
    );
    if (next.length !== owner.lessons.length) {
      updateStudent(owner.id, { lessons: next });
    }
  }
  return { ok: true };
}
