import { addStudentPaymentAction } from '@/components/lms/teacher/student-list/actions';
import { buildPaymentRecord } from './buildPaymentRecord';
import type { MutationResult, PaymentInput, SetPayments } from './types';

export async function addGroupPayment(input: {
  draft: PaymentInput;
  setPayments: SetPayments;
}): Promise<MutationResult> {
  const { draft, setPayments } = input;
  const res = await addStudentPaymentAction(draft);
  if (!res.ok) return { ok: false, error: res.error };

  setPayments((prev) => [...prev, buildPaymentRecord(res.id, res.monthKey, res.paidAt, draft)]);
  return { ok: true };
}
