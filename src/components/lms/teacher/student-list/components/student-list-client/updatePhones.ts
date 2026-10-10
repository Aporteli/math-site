import { updateStudentPhonesAction } from '@/components/lms/teacher/student-list/actions';
import type { MutationResult, SetStudents } from './types';

export async function updatePhones(input: {
  studentId: string;
  phone: string | null;
  parentPhone: string | null;
  email?: string | null;
  setStudents: SetStudents;
}): Promise<MutationResult> {
  const { studentId, phone, parentPhone, email, setStudents } = input;

  setStudents((prev) =>
    prev.map((s) =>
      s.id === studentId
        ? {
            ...s,
            phone: phone ?? '',
            parentPhone: parentPhone ?? undefined,
            ...(email !== undefined && { email: email ?? undefined }),
          }
        : s,
    ),
  );

  const res = await updateStudentPhonesAction({ studentId, phone, parentPhone, email });
  if (!res.ok) {
    console.error('[updateStudentPhones]', res.error);
    return { ok: false, error: res.error };
  }
  return { ok: true };
}
