import type { ActionResult, StudentListProps } from './types';

export async function saveStudentPhones(
  studentId: string,
  phone: string | null,
  parentPhone: string | null,
  onUpdatePhones: StudentListProps['onUpdatePhones'],
): Promise<ActionResult> {
  if (!onUpdatePhones) return { ok: true };

  const res = await onUpdatePhones(studentId, phone, parentPhone);
  if (!res.ok) {
    console.error('[updatePhones]', res.error);
  }
  return res;
}
