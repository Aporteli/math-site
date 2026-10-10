import type { PaymentRecord, StudentRecord } from '../../studentList.types';
import type { ActionResult, PaymentInput, StudentListProps } from './types';

export async function addPaymentForModal(
  input: PaymentInput,
  students: StudentRecord[],
  onAddIndividualPayment: StudentListProps['onAddIndividualPayment'],
  onAddGroupPayment: StudentListProps['onAddGroupPayment'],
): Promise<ActionResult> {
  const student = students.find((s) => s.id === input.studentId);
  if (!student) return { ok: false, error: 'მოსწავლე ვერ მოიძებნა' };

  const res =
    student.kind === 'individual'
      ? await (onAddIndividualPayment?.(input) ?? Promise.resolve({ ok: false, error: 'Not configured' }))
      : await (onAddGroupPayment?.(input) ?? Promise.resolve({ ok: false, error: 'Not configured' }));

  return res;
}

export async function deletePaymentForModal(
  paymentId: string,
  payments: PaymentRecord[],
  students: StudentRecord[],
  onDeleteIndividualPayment: StudentListProps['onDeleteIndividualPayment'],
  onDeleteGroupPayment: StudentListProps['onDeleteGroupPayment'],
): Promise<ActionResult> {
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) return { ok: false, error: 'გადახდა ვერ მოიძებნა' };
  const student = students.find((s) => s.id === payment.studentId);
  if (!student) return { ok: false, error: 'მოსწავლე ვერ მოიძებნა' };

  const res =
    student.kind === 'individual'
      ? await (onDeleteIndividualPayment?.(paymentId) ?? Promise.resolve({ ok: false, error: 'Not configured' }))
      : await (onDeleteGroupPayment?.(paymentId) ?? Promise.resolve({ ok: false, error: 'Not configured' }));

  return res;
}
