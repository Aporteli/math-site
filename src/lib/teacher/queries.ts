import 'server-only';

import { prisma } from '@/lib/prisma';
import type {
  PaymentRecord,
  StudentGroup,
  StudentRecord,
} from '@/components/lms/teacher/student-list/studentList.types';

/**
 * მასწავლებლის ყველა ჯგუფი (Course) — StudentGroup[] ფორმატში
 */
export async function getTeacherGroups(
  teacherId: string,
): Promise<StudentGroup[]> {
  const courses = await prisma.course.findMany({
    where: { teacherId },
    select: { id: true, title: true, defaultMonthlyPrice: true },
    orderBy: { title: 'asc' },
  });

  return courses.map((c) => ({
    id: c.id,
    name: c.title,
    monthlyPrice: Number(c.defaultMonthlyPrice ?? 0),
  }));
}

/**
 * მასწავლებლის ყველა აქტიური მოსწავლე.
 * თუ მოსწავლე რამდენიმე ჯგუფშია — გაერთიანდება ერთ StudentRecord-ად:
 * groupIds[] მასივში იქნება ყველა ჯგუფის id, lessons[] ყველა გაკვეთილი.
 */
export async function getTeacherStudents(
  teacherId: string,
): Promise<StudentRecord[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      status: 'ACTIVE',
      course: { teacherId },
      user: { role: 'STUDENT' },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          parentPhone: true,
        },
      },
      course: {
        select: { id: true, title: true, defaultMonthlyPrice: true },
      },
      lessons: true,
    },
    orderBy: { enrolledAt: 'asc' },
  });

  const map = new Map<string, StudentRecord>();

  for (const e of enrollments) {
    const u = e.user;
    const price = Number(e.monthlyPrice ?? e.course.defaultMonthlyPrice ?? 0);

    const lessons = e.lessons
      .map((l) => ({
        id: l.id,
        dayOfWeek: l.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        startTime: l.startTime,
        endTime: l.endTime,
        groupId: e.course.id,
      }))
      .sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.startTime.localeCompare(b.startTime);
      });

    const existing = map.get(u.id);
    if (existing) {
      existing.groupIds.push(e.course.id);
      existing.monthlyPrice += price;
      existing.lessons.push(...lessons);
    } else {
      const parts = u.name.trim().split(/\s+/);
      const firstName = parts[0] ?? u.name;
      const lastName = parts.slice(1).join(' ') || '';

      map.set(u.id, {
        id: u.id,
        firstName,
        lastName,
        phone: u.phone ?? '',
        parentPhone: u.parentPhone ?? undefined,
        email: u.email ?? undefined,
        groupIds: [e.course.id],
        monthlyPrice: price,
        paidAmount: 0,
        lessons,
        status: 'active',
      });
    }
  }

  return Array.from(map.values());
}

/**
 * მასწავლებლის ყველა მოსწავლის გადახდა.
 * თუ monthKeys მიეცი — მხოლოდ იმ თვეების ჩანაწერები მოვა.
 */
export async function getTeacherPayments(
  teacherId: string,
  monthKeys?: string[],
): Promise<PaymentRecord[]> {
  const rows = await prisma.payment.findMany({
    where: {
      student: {
        enrollments: { some: { course: { teacherId } } },
      },
      ...(monthKeys && monthKeys.length > 0
        ? { monthKey: { in: monthKeys } }
        : {}),
    },
    orderBy: { paidAt: 'desc' },
  });

  return rows.map((p) => ({
    id: p.id,
    studentId: p.studentId,
    monthKey: p.monthKey,
    amount: Number(p.amount),
    paidAt: p.paidAt.toISOString(),
    method: p.method
      ? (p.method.toLowerCase() as 'cash' | 'card' | 'transfer')
      : undefined,
    note: p.note ?? undefined,
  }));
}