'use client';

import { useState, useTransition } from 'react';
import { StudentList } from './StudentList';
import {
  setStudentPaymentAction,
  updateStudentPriceAction,
  updateStudentPhonesAction,
} from '@/lib/teacher/actions';
import type {
  PaymentRecord,
  StudentGroup,
  StudentRecord,
} from '../studentList.types';

interface Props {
  initialStudents: StudentRecord[];
  groups: StudentGroup[];
  initialPayments?: PaymentRecord[];
}

export function StudentListClient({
  initialStudents,
  groups,
  initialPayments = [],
}: Props) {
  const [students, setStudents] = useState<StudentRecord[]>(initialStudents);
  const [payments, setPayments] = useState<PaymentRecord[]>(initialPayments);
  const [, startTransition] = useTransition();

  /* ════════════ მოსწავლის ფასი ════════════ */
  const handleUpdateStudent = (id: string, patch: Partial<StudentRecord>) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );

    if (typeof patch.monthlyPrice === 'number') {
      const student = students.find((s) => s.id === id);
      const groupId = student?.groupIds[0];
      if (groupId) {
        startTransition(async () => {
          const res = await updateStudentPriceAction({
            studentId: id,
            groupId,
            monthlyPrice: patch.monthlyPrice!,
          });
          if (!res.ok) console.error('[updateStudentPrice]', res.error);
        });
      }
    }
  };

  /* ════════════ გადახდები ════════════ */
  const handleUpdatePayments = (next: PaymentRecord[]) => {
    const prevMap = new Map(
      payments.map((p) => [`${p.studentId}|${p.monthKey}`, p]),
    );
    const nextMap = new Map(
      next.map((p) => [`${p.studentId}|${p.monthKey}`, p]),
    );

    const changed: PaymentRecord[] = [];
    const removed: { studentId: string; monthKey: string }[] = [];

    next.forEach((p) => {
      const key = `${p.studentId}|${p.monthKey}`;
      const old = prevMap.get(key);
      if (!old || old.amount !== p.amount) {
        changed.push(p);
      }
    });

    payments.forEach((p) => {
      const key = `${p.studentId}|${p.monthKey}`;
      if (!nextMap.has(key)) {
        removed.push({ studentId: p.studentId, monthKey: p.monthKey });
      }
    });

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
  };

  /* ════════════ ტელეფონები ════════════ */
  const handleUpdatePhones = async (
    studentId: string,
    phone: string | null,
    parentPhone: string | null,
  ): Promise<{ ok: boolean; error?: string }> => {
    // optimistic
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              phone: phone ?? '',
              parentPhone: parentPhone ?? undefined,
            }
          : s,
      ),
    );

    const res = await updateStudentPhonesAction({
      studentId,
      phone,
      parentPhone,
    });

    if (!res.ok) {
      console.error('[updateStudentPhones]', res.error);
      return { ok: false, error: res.error };
    }
    return { ok: true };
  };

  return (
    <div className="min-w-0">
      <StudentList
        students={students}
        groups={groups}
        initialPayments={payments}
        onUpdateStudent={handleUpdateStudent}
        onUpdatePayments={handleUpdatePayments}
        onUpdatePhones={handleUpdatePhones}
        onSelectStudent={(s) => console.log('selected', s)}
      />
    </div>
  );
}