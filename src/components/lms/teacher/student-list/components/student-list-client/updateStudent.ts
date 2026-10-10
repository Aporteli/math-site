import {
  updateIndividualStudentAction,
  updateStudentPaymentDateAction,
  updateStudentPriceAction,
} from '@/components/lms/teacher/student-list/actions';
import type { StudentRecord } from '../../studentList.types';
import { toIndividualPatch } from './toIndividualPatch';
import type { SetStudents, StartTransition } from './types';

export function updateStudent(input: {
  id: string;
  patch: Partial<StudentRecord>;
  students: StudentRecord[];
  setStudents: SetStudents;
  startTransition: StartTransition;
}) {
  const { id, patch, students, setStudents, startTransition } = input;

  setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const student = students.find((s) => s.id === id);
  if (!student) return;

  if (patch.paymentDate !== undefined) {
    startTransition(async () => {
      const res = await updateStudentPaymentDateAction({
        studentId: id,
        paymentDate: patch.paymentDate?.trim() ? patch.paymentDate.trim() : null,
      });
      if (!res.ok) console.error('[updateStudentPaymentDate]', res.error);
    });
  }

  if (student.kind === 'individual') {
    const hasSomething =
      patch.monthlyPrice !== undefined ||
      patch.priceType !== undefined ||
      patch.firstName !== undefined ||
      patch.lastName !== undefined ||
      patch.phone !== undefined ||
      patch.parentPhone !== undefined ||
      patch.email !== undefined ||
      patch.note !== undefined ||
      patch.status !== undefined;

    if (!hasSomething) return;

    startTransition(async () => {
      const res = await updateIndividualStudentAction({
        studentId: id,
        patch: toIndividualPatch(patch),
      });
      if (!res.ok) console.error('[updateIndividualStudent]', res.error);
    });
    return;
  }

  const groupId = student.groupIds[0];
  if (!groupId) return;

  if (patch.monthlyPrice !== undefined || patch.priceType !== undefined || patch.note !== undefined) {
    startTransition(async () => {
      const res = await updateStudentPriceAction({
        studentId: id,
        groupId,
        monthlyPrice: patch.monthlyPrice,
        priceType: patch.priceType,
        ...(patch.note !== undefined && { note: patch.note ?? null }),
      });
      if (!res.ok) console.error('[updateStudentPrice]', res.error);
    });
  }
}
