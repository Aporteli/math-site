'use client';

import { useState, useTransition } from 'react';
import { StudentList } from './StudentList';
import {
  setStudentPaymentAction,
  updateStudentPriceAction,
  updateStudentPaymentDateAction,
  updateStudentPhonesAction,
  createIndividualStudentAction,
  updateIndividualStudentAction,
  deleteIndividualStudentAction,
  addIndividualPaymentAction,
  deleteIndividualPaymentAction,
  addStudentPaymentAction,
  deleteStudentPaymentAction,
  toggleMissedLessonAction,
} from '@/components/lms/teacher/student-list/actions';
import type {
  MissedLesson,
  PaymentRecord,
  PriceType,
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

  /* ════════════ მოსწავლის განახლება (ჯგუფური + ინდივიდუალური) ════════════ */
  const handleUpdateStudent = (id: string, patch: Partial<StudentRecord>) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

    const student = students.find((s) => s.id === id);
    if (!student) return;

    if (patch.paymentDate !== undefined) {
      startTransition(async () => {
        const res = await updateStudentPaymentDateAction({
          studentId: id,
          paymentDate: patch.paymentDate?.trim() ? patch.paymentDate.trim() : null,
        });
        if (!res.ok) console.error('[updateStudentPaymentDate]', res.error);
      });
    }

    if (student.kind === 'individual') {
      const hasSomething =
        patch.monthlyPrice !== undefined ||
        patch.priceType !== undefined ||
        patch.firstName !== undefined ||
        patch.lastName !== undefined ||
        patch.phone !== undefined ||
        patch.parentPhone !== undefined ||
        patch.email !== undefined ||
        patch.note !== undefined ||
        patch.status !== undefined;

      if (!hasSomething) return;

      startTransition(async () => {
        const res = await updateIndividualStudentAction({
          studentId: id,
          patch: {
            ...(patch.firstName !== undefined && { firstName: patch.firstName }),
            ...(patch.lastName !== undefined && { lastName: patch.lastName }),
            ...(patch.phone !== undefined && { phone: patch.phone ?? null }),
            ...(patch.parentPhone !== undefined && {
              parentPhone: patch.parentPhone ?? null,
            }),
            ...(patch.email !== undefined && { email: patch.email ?? null }),
            ...(patch.monthlyPrice !== undefined && {
              monthlyPrice: patch.monthlyPrice,
            }),
            ...(patch.priceType !== undefined && { priceType: patch.priceType }),
            ...(patch.note !== undefined && { note: patch.note ?? null }),
            ...(patch.status !== undefined && { status: patch.status }),
          },
        });
        if (!res.ok) console.error('[updateIndividualStudent]', res.error);
      });
      return;
    }

    const groupId = student.groupIds[0];
    if (!groupId) return;

    if (patch.monthlyPrice !== undefined || patch.priceType !== undefined) {
      startTransition(async () => {
        const res = await updateStudentPriceAction({
          studentId: id,
          groupId,
          monthlyPrice: patch.monthlyPrice,
          priceType: patch.priceType,
        });
        if (!res.ok) console.error('[updateStudentPrice]', res.error);
      });
    }
  };

  /* ════════════ კალენდრის set-paid (ჯგუფური) ════════════ */
  const handleUpdatePayments = (next: PaymentRecord[]) => {
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
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? { ...s, phone: phone ?? '', parentPhone: parentPhone ?? undefined }
          : s,
      ),
    );

    const res = await updateStudentPhonesAction({ studentId, phone, parentPhone });
    if (!res.ok) {
      console.error('[updateStudentPhones]', res.error);
      return { ok: false, error: res.error };
    }
    return { ok: true };
  };

  /* ════════════ ინდივიდუალური მოსწავლეები ════════════ */
  const handleCreateIndividual = async (input: {
    firstName: string;
    lastName: string;
    phone?: string;
    parentPhone?: string;
    email?: string;
    monthlyPrice?: number;
    priceType?: PriceType;
    note?: string;
  }): Promise<{ ok: boolean; error?: string; id?: string }> => {
    const res = await createIndividualStudentAction(input);
    if (!res.ok) return { ok: false, error: res.error };

    setStudents((prev) => [
      ...prev,
      {
        id: res.id,
        kind: 'individual',
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? '',
        parentPhone: input.parentPhone,
        email: input.email,
        groupIds: [],
        monthlyPrice: input.monthlyPrice ?? 0,
        priceType: input.priceType ?? 'MONTHLY',
        paidAmount: 0,
        lessons: [],
        status: 'active',
        note: input.note,
        missedLessons: [],
      },
    ]);
    return { ok: true, id: res.id };
  };

  const handleUpdateIndividual = async (
    studentId: string,
    patch: Partial<StudentRecord>,
  ): Promise<{ ok: boolean; error?: string }> => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, ...patch } : s)),
    );

    const res = await updateIndividualStudentAction({
      studentId,
      patch: {
        ...(patch.firstName !== undefined && { firstName: patch.firstName }),
        ...(patch.lastName !== undefined && { lastName: patch.lastName }),
        ...(patch.phone !== undefined && { phone: patch.phone ?? null }),
        ...(patch.parentPhone !== undefined && {
          parentPhone: patch.parentPhone ?? null,
        }),
        ...(patch.email !== undefined && { email: patch.email ?? null }),
        ...(patch.monthlyPrice !== undefined && {
          monthlyPrice: patch.monthlyPrice,
        }),
        ...(patch.priceType !== undefined && { priceType: patch.priceType }),
        ...(patch.note !== undefined && { note: patch.note ?? null }),
        ...(patch.status !== undefined && { status: patch.status }),
      },
    });
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true };
  };

  const handleDeleteIndividual = async (
    studentId: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await deleteIndividualStudentAction({ studentId });
    if (!res.ok) return { ok: false, error: res.error };

    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    setPayments((prev) => prev.filter((p) => p.studentId !== studentId));
    return { ok: true };
  };

  /* ════════════ ჯგუფური გადახდები (add/delete) ════════════ */
  const handleAddGroupPayment = async (input: {
    studentId: string;
    amount: number;
    paidAt: string;
    method?: 'cash' | 'card' | 'transfer';
    note?: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    const res = await addStudentPaymentAction(input);
    if (!res.ok) return { ok: false, error: res.error };

    setPayments((prev) => [
      ...prev,
      {
        id: res.id,
        studentId: input.studentId,
        monthKey: res.monthKey,
        amount: input.amount,
        paidAt: res.paidAt,
        method: input.method,
        note: input.note,
      },
    ]);
    return { ok: true };
  };

  const handleDeleteGroupPayment = async (
    paymentId: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await deleteStudentPaymentAction({ paymentId });
    if (!res.ok) return { ok: false, error: res.error };

    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    return { ok: true };
  };

  /* ════════════ ინდივიდუალური გადახდები (add/delete) ════════════ */
  const handleAddIndividualPayment = async (input: {
    studentId: string;
    amount: number;
    paidAt: string;
    method?: 'cash' | 'card' | 'transfer';
    note?: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    const res = await addIndividualPaymentAction(input);
    if (!res.ok) return { ok: false, error: res.error };

    setPayments((prev) => [
      ...prev,
      {
        id: res.id,
        studentId: input.studentId,
        monthKey: res.monthKey,
        amount: input.amount,
        paidAt: res.paidAt,
        method: input.method,
        note: input.note,
      },
    ]);
    return { ok: true };
  };

  const handleDeleteIndividualPayment = async (
    paymentId: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await deleteIndividualPaymentAction({ paymentId });
    if (!res.ok) return { ok: false, error: res.error };

    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    return { ok: true };
  };

  /* ════════════ გამოტოვებული გაკვეთილი ════════════ */
  const handleToggleMissed = async (
    studentId: string,
    lessonId: string,
    date: string,
    missed: boolean,
  ): Promise<void> => {
    const apply = (s: StudentRecord, m: boolean): StudentRecord => {
      if (s.id !== studentId) return s;
      const current = s.missedLessons ?? [];
      const filtered = current.filter(
        (x) => !(x.lessonId === lessonId && x.date === date),
      );
      const next: MissedLesson[] = m
        ? [...filtered, { lessonId, date }]
        : filtered;
      return { ...s, missedLessons: next };
    };

    // optimistic update
    setStudents((prev) => prev.map((s) => apply(s, missed)));

    const res = await toggleMissedLessonAction({
      studentId,
      lessonId,
      date,
      missed,
    });
    if (!res.ok) {
      // revert on failure
      setStudents((prev) => prev.map((s) => apply(s, !missed)));
      console.error('[toggleMissed]', res.error);
    }
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
        onCreateIndividual={handleCreateIndividual}
        onUpdateIndividual={handleUpdateIndividual}
        onDeleteIndividual={handleDeleteIndividual}
        onAddGroupPayment={handleAddGroupPayment}
        onDeleteGroupPayment={handleDeleteGroupPayment}
        onAddIndividualPayment={handleAddIndividualPayment}
        onDeleteIndividualPayment={handleDeleteIndividualPayment}
        onToggleMissed={handleToggleMissed}
      />
    </div>
  );
}