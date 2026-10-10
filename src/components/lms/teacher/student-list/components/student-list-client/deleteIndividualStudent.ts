import { deleteIndividualStudentAction } from '@/components/lms/teacher/student-list/actions';
import type { MutationResult, SetGroups, SetPayments, SetStudents } from './types';

export async function deleteIndividualStudent(input: {
  studentId: string;
  setGroupList: SetGroups;
  setStudents: SetStudents;
  setPayments: SetPayments;
}): Promise<MutationResult> {
  const { studentId, setGroupList, setStudents, setPayments } = input;
  const res = await deleteIndividualStudentAction({ studentId });
  if (!res.ok) return { ok: false, error: res.error };

  if (res.removedGroupId) {
    setGroupList((prev) => prev.filter((g) => g.id !== res.removedGroupId));
  }
  setStudents((prev) => prev.filter((s) => s.id !== studentId));
  setPayments((prev) => prev.filter((p) => p.studentId !== studentId));
  return { ok: true };
}
