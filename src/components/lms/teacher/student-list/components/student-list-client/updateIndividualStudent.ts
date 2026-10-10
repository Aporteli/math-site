import { updateIndividualStudentAction } from '@/components/lms/teacher/student-list/actions';
import type { StudentRecord } from '../../studentList.types';
import { toIndividualPatch } from './toIndividualPatch';
import type { MutationResult, SetStudents } from './types';

export async function updateIndividualStudent(input: {
  studentId: string;
  patch: Partial<StudentRecord>;
  setStudents: SetStudents;
}): Promise<MutationResult> {
  const { studentId, patch, setStudents } = input;

  setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, ...patch } : s)));

  const res = await updateIndividualStudentAction({
    studentId,
    patch: toIndividualPatch(patch),
  });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true };
}
