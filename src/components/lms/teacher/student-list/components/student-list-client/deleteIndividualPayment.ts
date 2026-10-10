import { deleteIndividualPaymentAction } from '@/components/lms/teacher/student-list/actions';
import type { MutationResult, SetPayments } from './types';

export async function deleteIndividualPayment(input: {
  paymentId: string;
  setPayments: SetPayments;
}): Promise<MutationResult> {
  const { paymentId, setPayments } = input;
  const res = await deleteIndividualPaymentAction({ paymentId });
  if (!res.ok) return { ok: false, error: res.error };

  setPayments((prev) => prev.filter((p) => p.id !== paymentId));
  return { ok: true };
}
