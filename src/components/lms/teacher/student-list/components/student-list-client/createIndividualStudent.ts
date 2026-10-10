import { createIndividualStudentAction } from '@/components/lms/teacher/student-list/actions';
import type { StudentRecord } from '../../studentList.types';
import type { CreateIndividualInput, CreateMutationResult, SetStudents } from './types';

function buildCreatedStudent(id: string, input: CreateIndividualInput): StudentRecord {
  return {
    id,
    kind: 'individual',
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone ?? '',
    parentPhone: input.parentPhone,
    email: input.email,
    groupIds: [],
    homeGroupId: undefined,
    monthlyPrice: input.monthlyPrice ?? 0,
    priceType: input.priceType ?? 'MONTHLY',
    paidAmount: 0,
    lessons: [],
    status: 'active',
    note: input.note,
    missedLessons: [],
  };
}

export async function createIndividualStudent(input: {
  draft: CreateIndividualInput;
  setStudents: SetStudents;
}): Promise<CreateMutationResult> {
  const { draft, setStudents } = input;
  const res = await createIndividualStudentAction(draft);
  if (!res.ok) return { ok: false, error: res.error };

  setStudents((prev) => [...prev, buildCreatedStudent(res.id, draft)]);
  return { ok: true, id: res.id };
}
