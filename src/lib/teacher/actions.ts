'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

/* ═══════════════════════════════════════════════════════════════
   გადახდები
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

  if (input.amount <= 0) {
    await prisma.payment.deleteMany({
      where: {
        studentId: input.studentId,
        monthKey: input.monthKey,
      },
    });
  } else {
    const method = input.method
      ? (input.method.toUpperCase() as 'CASH' | 'CARD' | 'TRANSFER')
      : null;

    await prisma.payment.upsert({
      where: {
        studentId_monthKey: {
          studentId: input.studentId,
          monthKey: input.monthKey,
        },
      },
      create: {
        studentId: input.studentId,
        monthKey: input.monthKey,
        amount: input.amount,
        method,
        recordedById: user.user.id,
      },
      update: {
        amount: input.amount,
        method,
        recordedById: user.user.id,
        paidAt: new Date(),
      },
    });
  }

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════════
   მოსწავლის თვიური ფასი
   ═══════════════════════════════════════════════════════════════ */

export async function updateStudentPriceAction(input: {
  studentId: string;
  groupId: string;
  monthlyPrice: number;
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
    data: { monthlyPrice: input.monthlyPrice },
  });

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════════
   გაკვეთილის დროები
   ═══════════════════════════════════════════════════════════════ */

export async function addLessonSlotAction(input: {
  studentId: string;
  groupId: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startTime: string;
  endTime: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
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

  if (input.startTime >= input.endTime) {
    return { ok: false, error: 'დაწყების დრო უნდა იყოს დასრულების დროზე ადრე' };
  }

  if (
    !/^\d{2}:\d{2}$/.test(input.startTime) ||
    !/^\d{2}:\d{2}$/.test(input.endTime)
  ) {
    return { ok: false, error: 'დროის ფორმატი არასწორია' };
  }

  const lesson = await prisma.lessonSlot.create({
    data: {
      enrollmentId: enrollment.id,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
    },
  });

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true, id: lesson.id };
}

export async function deleteLessonSlotAction(input: {
  lessonId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSession();
  if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };

  const lesson = await prisma.lessonSlot.findFirst({
    where: {
      id: input.lessonId,
      enrollment: { course: { teacherId: user.user.id } },
    },
    select: { id: true },
  });
  if (!lesson) return { ok: false, error: 'Forbidden' };

  await prisma.lessonSlot.delete({ where: { id: lesson.id } });

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════════
   ტელეფონის ნომრები (მოსწავლე + მშობელი)
   ═══════════════════════════════════════════════════════════════ */

/**
 * მოსწავლის და მშობლის ტელეფონების განახლება.
 * null ან ცარიელი string → ველი გასუფთავდება (წაიშლება).
 */
export async function updateStudentPhonesAction(input: {
  studentId: string;
  phone: string | null;
  parentPhone: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSession();
  if (!user?.user?.id) return { ok: false, error: 'Unauthorized' };

  // უსაფრთხოება — მხოლოდ იმ მოსწავლეზე, რომელიც ამ მასწავლებლის ჯგუფშია
  const allowed = await prisma.enrollment.findFirst({
    where: {
      userId: input.studentId,
      course: { teacherId: user.user.id },
    },
    select: { id: true },
  });
  if (!allowed) return { ok: false, error: 'Forbidden' };

  // ნორმალიზაცია — ცარიელი string → null
  const phone = input.phone?.trim() || null;
  const parentPhone = input.parentPhone?.trim() || null;

  // ვალიდაცია — თუ არა ცარიელი, უნდა შეიცავდეს ციფრებს
  if (phone && !/[0-9]/.test(phone)) {
    return { ok: false, error: 'მოსწავლის ტელეფონი უნდა შეიცავდეს ციფრებს' };
  }
  if (parentPhone && !/[0-9]/.test(parentPhone)) {
    return { ok: false, error: 'მშობლის ტელეფონი უნდა შეიცავდეს ციფრებს' };
  }

  await prisma.user.update({
    where: { id: input.studentId },
    data: {
      phone,
      parentPhone,
    },
  });

  revalidatePath('/[locale]/teacher/student-list', 'page');
  return { ok: true };
}