'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

/* ═══════════════════════════════════════════════════════════════
   ჯგუფის მოსწავლის გადახდები — ახალი (delta-ს ლოგიკა)
   ═══════════════════════════════════════════════════════════════ */

export async function addStudentPaymentAction(input: {
  studentId: string;
  amount: number;
  paidAt?: string;
  method?: 'cash' | 'card' | 'transfer';
  note?: string;
}): Promise<
  | { ok: true; id: string; monthKey: string; paidAt: string }
  | { ok: false; error: string }
> {
  const user = await getSession();
  if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };

  const allowed = await prisma.enrollment.findFirst({
    where: {
      userId: input.studentId,
      course: { teacherId: user.user.id },
    },
    select: { id: true },
  });
  if (!allowed) return { ok: false, error: 'Forbidden' };

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: 'თანხა უნდა იყოს 0-ზე მეტი' };
  }

  const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();
  if (Number.isNaN(paidAt.getTime())) {
    return { ok: false, error: 'თარიღი არასწორია' };
  }
  const monthKey = `${paidAt.getFullYear()}-${String(paidAt.getMonth() + 1).padStart(2, '0')}`;
  const method = input.method
    ? (input.method.toUpperCase() as 'CASH' | 'CARD' | 'TRANSFER')
    : null;

  const payment = await prisma.payment.create({
    data: {
      studentId: input.studentId,
      amount: input.amount,
      paidAt,
      monthKey,
      method,
      note: input.note?.trim() || null,
      recordedById: user.user.id,
    },
  });

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return {
    ok: true,
    id: payment.id,
    monthKey,
    paidAt: payment.paidAt.toISOString(),
  };
}

export async function deleteStudentPaymentAction(input: {
  paymentId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSession();
  if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };

  const found = await prisma.payment.findFirst({
    where: {
      id: input.paymentId,
      student: {
        enrollments: { some: { course: { teacherId: user.user.id } } },
      },
    },
    select: { id: true },
  });
  if (!found) return { ok: false, error: 'Forbidden' };

  await prisma.payment.delete({ where: { id: found.id } });

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════════
   კალენდრის set-paid (delete all + create one)
   ═══════════════════════════════════════════════════════════════ */

export async function setStudentPaymentAction(input: {
  studentId: string;
  monthKey: string;
  amount: number;
  method?: 'cash' | 'card' | 'transfer';
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSession();
  if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };

  const allowed = await prisma.enrollment.findFirst({
    where: {
      userId: input.studentId,
      course: { teacherId: user.user.id },
    },
    select: { id: true },
  });
  if (!allowed) return { ok: false, error: 'Forbidden' };

  await prisma.payment.deleteMany({
    where: {
      studentId: input.studentId,
      monthKey: input.monthKey,
    },
  });

  if (input.amount > 0) {
    const method = input.method
      ? (input.method.toUpperCase() as 'CASH' | 'CARD' | 'TRANSFER')
      : null;

    await prisma.payment.create({
      data: {
        studentId: input.studentId,
        monthKey: input.monthKey,
        amount: input.amount,
        method,
        recordedById: user.user.id,
      },
    });
  }

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════════
   მოსწავლის ფასი + priceType (ჯგუფის)
   ═══════════════════════════════════════════════════════════════ */

export async function updateStudentPriceAction(input: {
  studentId: string;
  groupId: string;
  monthlyPrice?: number;
  priceType?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'PER_LESSON';
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSession();
  if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: input.studentId,
      courseId: input.groupId,
      course: { teacherId: user.user.id },
    },
    select: { id: true },
  });
  if (!enrollment) return { ok: false, error: 'Forbidden' };

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      ...(input.monthlyPrice !== undefined && {
        monthlyPrice: Math.max(0, input.monthlyPrice),
      }),
      ...(input.priceType !== undefined && {
        priceType: input.priceType,
      }),
    },
  });

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════════
   გადახდის თარიღი (ჯგუფის + ინდივიდუალური)
   ═══════════════════════════════════════════════════════════════ */

export async function updateStudentPaymentDateAction(input: {
  studentId: string;
  paymentDate: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSession();
  if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };

  const paymentDate = input.paymentDate?.trim() || null;
  if (paymentDate && !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
    return { ok: false, error: 'თარიღი არასწორია' };
  }

  const individual = await prisma.individualStudent.findFirst({
    where: { id: input.studentId, teacherId: user.user.id },
    select: { id: true },
  });

  if (individual) {
    await prisma.individualStudent.update({
      where: { id: individual.id },
      data: { paymentDate },
    });
    revalidatePath('/[locale]/teacher/student-list', 'page');
    return { ok: true };
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: input.studentId,
      course: { teacherId: user.user.id },
    },
    select: { id: true },
  });
  if (!enrollment) return { ok: false, error: 'Forbidden' };

  await prisma.enrollment.updateMany({
    where: {
      userId: input.studentId,
      course: { teacherId: user.user.id },
    },
    data: { paymentDate },
  });

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════════
   გაკვეთილის დროები (ჯგუფის)
   ═══════════════════════════════════════════════════════════════ */

export async function addLessonSlotAction(input: {
  studentId: string;
  groupId: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startTime: string;
  endTime: string;
}): Promise<
  | { ok: true; id: string; copies: { studentId: string; lessonId: string }[] }
  | { ok: false; error: string }
> {
  const user = await getSession();
  if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };

  const allowed = await prisma.enrollment.findFirst({
    where: {
      userId: input.studentId,
      courseId: input.groupId,
      course: { teacherId: user.user.id },
    },
    select: { id: true },
  });
  if (!allowed) return { ok: false, error: 'Forbidden' };

  if (input.startTime >= input.endTime) {
    return { ok: false, error: 'დაწყების დრო უნდა იყოს დასრულების დროზე ადრე' };
  }
  if (
    !/^\d{2}:\d{2}$/.test(input.startTime) ||
    !/^\d{2}:\d{2}$/.test(input.endTime)
  ) {
    return { ok: false, error: 'დროის ფორმატი არასწორია' };
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      courseId: input.groupId,
      course: { teacherId: user.user.id },
      OR: [{ status: 'ACTIVE' }, { userId: input.studentId }],
    },
    select: {
      id: true,
      userId: true,
      lessons: {
        where: {
          dayOfWeek: input.dayOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  const copies: { studentId: string; lessonId: string }[] = [];
  let triggerId: string | null = null;

  const creates = enrollments.filter((enrollment) => {
    const existingId = enrollment.lessons[0]?.id;
    if (existingId) {
      if (enrollment.userId === input.studentId) triggerId = existingId;
      return false;
    }
    return true;
  });

  if (creates.length > 0) {
    const created = await prisma.$transaction(
      creates.map((enrollment) =>
        prisma.lessonSlot.create({
          data: {
            enrollmentId: enrollment.id,
            dayOfWeek: input.dayOfWeek,
            startTime: input.startTime,
            endTime: input.endTime,
          },
        }),
      ),
    );

    created.forEach((lesson, index) => {
      const enrollment = creates[index];
      copies.push({ studentId: enrollment.userId, lessonId: lesson.id });
      if (enrollment.userId === input.studentId) triggerId = lesson.id;
    });
  }

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true, id: triggerId ?? copies[0]?.lessonId ?? allowed.id, copies };
}

export async function deleteLessonSlotAction(input: {
  lessonId: string;
}): Promise<
  | {
      ok: true;
      match: {
        groupId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
      };
    }
  | { ok: false; error: string }
> {
  const user = await getSession();
  if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };

  const lesson = await prisma.lessonSlot.findFirst({
    where: {
      id: input.lessonId,
      enrollment: { course: { teacherId: user.user.id } },
    },
    select: {
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      enrollment: { select: { courseId: true } },
    },
  });
  if (!lesson) return { ok: false, error: 'Forbidden' };

  const match = {
    groupId: lesson.enrollment.courseId,
    dayOfWeek: lesson.dayOfWeek,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
  };

  await prisma.lessonSlot.deleteMany({
    where: {
      dayOfWeek: match.dayOfWeek,
      startTime: match.startTime,
      endTime: match.endTime,
      enrollment: {
        courseId: match.groupId,
        course: { teacherId: user.user.id },
      },
    },
  });

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true, match };
}

/* ═══════════════════════════════════════════════════════════════
   ტელეფონები (ჯგუფის)
   ═══════════════════════════════════════════════════════════════ */

export async function updateStudentPhonesAction(input: {
  studentId: string;
  phone: string | null;
  parentPhone: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSession();
  if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };

  const allowed = await prisma.enrollment.findFirst({
    where: {
      userId: input.studentId,
      course: { teacherId: user.user.id },
    },
    select: { id: true },
  });
  if (!allowed) return { ok: false, error: 'Forbidden' };

  const phone = input.phone?.trim() || null;
  const parentPhone = input.parentPhone?.trim() || null;

  if (phone && !/[0-9]/.test(phone)) {
    return { ok: false, error: 'მოსწავლის ტელეფონი უნდა შეიცავდეს ციფრებს' };
  }
  if (parentPhone && !/[0-9]/.test(parentPhone)) {
    return { ok: false, error: 'მშობლის ტელეფონი უნდა შეიცავდეს ციფრებს' };
  }

  await prisma.user.update({
    where: { id: input.studentId },
    data: { phone, parentPhone },
  });

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════════
   ინდივიდუალური მოსწავლეები
   ═══════════════════════════════════════════════════════════════ */

export async function createIndividualStudentAction(input: {
  firstName: string;
  lastName: string;
  phone?: string;
  parentPhone?: string;
  email?: string;
  monthlyPrice?: number;
  priceType?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'PER_LESSON';
  note?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await getSession();
  if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) {
    return { ok: false, error: 'სახელი და გვარი სავალდებულოა' };
  }

  const created = await prisma.individualStudent.create({
    data: {
      teacherId: user.user.id,
      firstName,
      lastName,
      phone: input.phone?.trim() || null,
      parentPhone: input.parentPhone?.trim() || null,
      email: input.email?.trim() || null,
      monthlyPrice: Math.max(0, input.monthlyPrice ?? 0),
      priceType: input.priceType ?? 'MONTHLY',
      note: input.note?.trim() || null,
    },
  });

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true, id: created.id };
}

export async function updateIndividualStudentAction(input: {
  studentId: string;
  patch: Partial<{
    firstName: string;
    lastName: string;
    phone: string | null;
    parentPhone: string | null;
    email: string | null;
    monthlyPrice: number;
    priceType: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'PER_LESSON';
    note: string | null;
    status: 'active' | 'paused' | 'finished';
  }>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSession();
  if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };

  const found = await prisma.individualStudent.findFirst({
    where: { id: input.studentId, teacherId: user.user.id },
    select: { id: true },
  });
  if (!found) return { ok: false, error: 'Forbidden' };

  const p = input.patch;
  await prisma.individualStudent.update({
    where: { id: found.id },
    data: {
      ...(p.firstName !== undefined && { firstName: p.firstName.trim() }),
      ...(p.lastName !== undefined && { lastName: p.lastName.trim() }),
      ...(p.phone !== undefined && { phone: p.phone?.trim() || null }),
      ...(p.parentPhone !== undefined && {
        parentPhone: p.parentPhone?.trim() || null,
      }),
      ...(p.email !== undefined && { email: p.email?.trim() || null }),
      ...(p.monthlyPrice !== undefined && {
        monthlyPrice: Math.max(0, p.monthlyPrice),
      }),
      ...(p.priceType !== undefined && { priceType: p.priceType }),
      ...(p.note !== undefined && { note: p.note?.trim() || null }),
      ...(p.status !== undefined && { status: p.status }),
    },
  });

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true };
}

export async function deleteIndividualStudentAction(input: {
  studentId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSession();
  if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };

  const found = await prisma.individualStudent.findFirst({
    where: { id: input.studentId, teacherId: user.user.id },
    select: { id: true },
  });
  if (!found) return { ok: false, error: 'Forbidden' };

  await prisma.individualStudent.delete({ where: { id: found.id } });

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════════
   ინდივიდუალური გაკვეთილის დროები
   ═══════════════════════════════════════════════════════════════ */

export async function addIndividualLessonAction(input: {
  studentId: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startTime: string;
  endTime: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await getSession();
  if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };

  const found = await prisma.individualStudent.findFirst({
    where: { id: input.studentId, teacherId: user.user.id },
    select: { id: true },
  });
  if (!found) return { ok: false, error: 'Forbidden' };

  if (input.startTime >= input.endTime) {
    return { ok: false, error: 'დაწყების დრო უნდა იყოს დასრულების დროზე ადრე' };
  }
  if (
    !/^\d{2}:\d{2}$/.test(input.startTime) ||
    !/^\d{2}:\d{2}$/.test(input.endTime)
  ) {
    return { ok: false, error: 'დროის ფორმატი არასწორია' };
  }

  const lesson = await prisma.individualLesson.create({
    data: {
      studentId: found.id,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
    },
  });

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true, id: lesson.id };
}

export async function deleteIndividualLessonAction(input: {
  lessonId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSession();
  if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };

  const lesson = await prisma.individualLesson.findFirst({
    where: {
      id: input.lessonId,
      student: { teacherId: user.user.id },
    },
    select: { id: true },
  });
  if (!lesson) return { ok: false, error: 'Forbidden' };

  await prisma.individualLesson.delete({ where: { id: lesson.id } });

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════════
   ინდივიდუალური გადახდები
   ═══════════════════════════════════════════════════════════════ */

export async function addIndividualPaymentAction(input: {
  studentId: string;
  amount: number;
  paidAt?: string;
  method?: 'cash' | 'card' | 'transfer';
  note?: string;
}): Promise<
  | { ok: true; id: string; monthKey: string; paidAt: string }
  | { ok: false; error: string }
> {
  const user = await getSession();
  if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };

  const found = await prisma.individualStudent.findFirst({
    where: { id: input.studentId, teacherId: user.user.id },
    select: { id: true },
  });
  if (!found) return { ok: false, error: 'Forbidden' };

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: 'თანხა უნდა იყოს 0-ზე მეტი' };
  }

  const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();
  if (Number.isNaN(paidAt.getTime())) {
    return { ok: false, error: 'თარიღი არასწორია' };
  }
  const monthKey = `${paidAt.getFullYear()}-${String(paidAt.getMonth() + 1).padStart(2, '0')}`;
  const method = input.method
    ? (input.method.toUpperCase() as 'CASH' | 'CARD' | 'TRANSFER')
    : null;

  const payment = await prisma.individualPayment.create({
    data: {
      studentId: input.studentId,
      amount: input.amount,
      paidAt,
      monthKey,
      method,
      note: input.note?.trim() || null,
    },
  });

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return {
    ok: true,
    id: payment.id,
    monthKey,
    paidAt: payment.paidAt.toISOString(),
  };
}

export async function deleteIndividualPaymentAction(input: {
  paymentId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSession();
  if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };

  const found = await prisma.individualPayment.findFirst({
    where: {
      id: input.paymentId,
      student: { teacherId: user.user.id },
    },
    select: { id: true },
  });
  if (!found) return { ok: false, error: 'Forbidden' };

  await prisma.individualPayment.delete({ where: { id: found.id } });

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════════
   გამოტოვებული გაკვეთილის მონიშვნა/მოხსნა
   ═══════════════════════════════════════════════════════════════ */

   export async function toggleMissedLessonAction(input: {
    studentId: string;
    lessonId: string;
    date: string; // "YYYY-MM-DD"
    missed: boolean;
  }): Promise<{ ok: true } | { ok: false; error: string }> {
    const user = await getSession();
    if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };
  
    /* ─── ჯგუფური მოსწავლე (Enrollment) ─── */
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: input.studentId,
        course: { teacherId: user.user.id },
        lessons: { some: { id: input.lessonId } },
      },
      select: { id: true, missedLessons: true },
    });
  
    if (enrollment) {
      const current =
        (enrollment.missedLessons as { lessonId: string; date: string }[] | null) ?? [];
      const filtered = current.filter(
        (m) => !(m.lessonId === input.lessonId && m.date === input.date),
      );
      const next = input.missed
        ? [...filtered, { lessonId: input.lessonId, date: input.date }]
        : filtered;
  
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { missedLessons: next },
      });
  
      revalidatePath('/[locale]/teacher/student-list', 'page');
      return { ok: true };
    }
  
    /* ─── ინდივიდუალური მოსწავლე ─── */
    const individual = await prisma.individualStudent.findFirst({
      where: {
        id: input.studentId,
        teacherId: user.user.id,
        lessons: { some: { id: input.lessonId } },
      },
      select: { id: true, missedLessons: true },
    });
    if (!individual) return { ok: false, error: 'Forbidden' };
  
    const current =
      (individual.missedLessons as { lessonId: string; date: string }[] | null) ?? [];
    const filtered = current.filter(
      (m) => !(m.lessonId === input.lessonId && m.date === input.date),
    );
    const next = input.missed
      ? [...filtered, { lessonId: input.lessonId, date: input.date }]
      : filtered;
  
    await prisma.individualStudent.update({
      where: { id: individual.id },
      data: { missedLessons: next },
    });
  
    revalidatePath('/[locale]/teacher/student-list', 'page');
    return { ok: true };
  }