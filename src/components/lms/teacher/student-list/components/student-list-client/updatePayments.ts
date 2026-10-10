import { setStudentPaymentAction } from '@/components/lms/teacher/student-list/actions';
import type { PaymentRecord } from '../../studentList.types';
import { diffPaymentUpdates } from './diffPaymentUpdates';
import type { SetPayments, StartTransition } from './types';

export function updatePayments(input: {
  next: PaymentRecord[];
  payments: PaymentRecord[];
  setPayments: SetPayments;
  startTransition: StartTransition;
}) {
  const { next, payments, setPayments, startTransition } = input;
  const { changed, removed } = diffPaymentUpdates(payments, next);

  setPayments(next);

  startTransition(async () => {
    for (const p of changed) {
      const res = await setStudentPaymentAction({
        studentId: p.studentId,
        monthKey: p.monthKey,
        amount: p.amount,
        method: p.method,
      });
      if (!res.ok) console.error('[setPayment]', res.error);
    }
    for (const r of removed) {
      const res = await setStudentPaymentAction({
        studentId: r.studentId,
        monthKey: r.monthKey,
        amount: 0,
      });
      if (!res.ok) console.error('[deletePayment]', res.error);
    }
  });
}
