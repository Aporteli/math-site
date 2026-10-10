import type { PaymentRecord } from '../../studentList.types';
import type { PaymentInput } from './types';

export function buildPaymentRecord(
  id: string,
  monthKey: string,
  paidAt: string,
  input: PaymentInput,
): PaymentRecord {
  return {
    id,
    studentId: input.studentId,
    monthKey,
    amount: input.amount,
    paidAt,
    method: input.method,
    note: input.note,
  };
}
