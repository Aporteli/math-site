import type { PaymentRecord } from '../../studentList.types';

export function diffPaymentUpdates(payments: PaymentRecord[], next: PaymentRecord[]) {
  const prevMap = new Map(payments.map((p) => [`${p.studentId}|${p.monthKey}`, p]));
  const nextMap = new Map(next.map((p) => [`${p.studentId}|${p.monthKey}`, p]));

  const changed: PaymentRecord[] = [];
  const removed: { studentId: string; monthKey: string }[] = [];

  next.forEach((p) => {
    const key = `${p.studentId}|${p.monthKey}`;
    const old = prevMap.get(key);
    if (!old || old.amount !== p.amount) changed.push(p);
  });

  payments.forEach((p) => {
    const key = `${p.studentId}|${p.monthKey}`;
    if (!nextMap.has(key)) removed.push({ studentId: p.studentId, monthKey: p.monthKey });
  });

  return { changed, removed };
}
