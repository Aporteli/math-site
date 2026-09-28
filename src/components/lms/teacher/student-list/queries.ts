import 'server-only';

import { prisma } from '@/lib/prisma';
import type {
  MissedLesson,
  PaymentRecord,
  StudentGroup,
  StudentRecord,
} from '@/components/lms/teacher/student-list/studentList.types';

/* ─── JSON → MissedLesson[] (safe cast) ─── */
function parseMissedLessons(raw: unknown): MissedLesson[] {
  if (!Array.isArray(raw)) return [];
  const out: MissedLesson[] = [];
  for (const m of raw) {
    if (
      m &&
      typeof m === 'object' &&
      typeof (m as { lessonId?: unknown }).lessonId === 'string' &&
      typeof (m as { date?: unknown }).date === 'string'
    ) {
      out.push({
        lessonId: (m as { lessonId: string }).lessonId,
        date: (m as { date: string }).date,
      });
    }
  }
  return out;
}

export async function getTeacherGroups(
  teacherId: string,
): Promise<StudentGroup[]> {
  const [courses, homeGroups] = await Promise.all([
    prisma.course.findMany({
      where: { teacherId },
      select: { id: true, title: true, defaultMonthlyPrice: true },
      orderBy: { title: 'asc' },
    }),
    prisma.homeGroup.findMany({
      where: { teacherId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return [
    ...courses.map((c) => ({
      id: c.id,
      name: c.title,
      monthlyPrice: Number(c.defaultMonthlyPrice ?? 0),
    })),
    ...homeGroups.map((g) => ({
      id: g.id,
      name: g.name,
      monthlyPrice: 0,
      home: true as const,
    })),
  ];
}

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
    const missed = parseMissedLessons(e.missedLessons);

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
      existing.missedLessons = [...(existing.missedLessons ?? []), ...missed];
      if (!existing.paymentDate && e.paymentDate) {
        existing.paymentDate = e.paymentDate;
      }
      if (!existing.note && e.note) existing.note = e.note;
    } else {
      const parts = u.name.trim().split(/\s+/);
      const firstName = parts[0] ?? u.name;
      const lastName = parts.slice(1).join(' ') || '';

      map.set(u.id, {
        id: u.id,
        kind: 'group',
        firstName,
        lastName,
        phone: u.phone ?? '',
        parentPhone: u.parentPhone ?? undefined,
        email: u.email ?? undefined,
        groupIds: [e.course.id],
        monthlyPrice: price,
        priceType: e.priceType,
        paymentDate: e.paymentDate ?? undefined,
        note: e.note ?? undefined,
        paidAmount: 0,
        lessons,
        status: 'active',
        missedLessons: missed,
      });
    }
  }

  return Array.from(map.values());
}

export async function getTeacherIndividualStudents(
  teacherId: string,
): Promise<StudentRecord[]> {
  const rows = await prisma.individualStudent.findMany({
    where: { teacherId },
    include: { lessons: true },
    orderBy: { createdAt: 'asc' },
  });

  const mapped = rows.map((s) => ({
    id: s.id,
    kind: 'individual' as const,
    firstName: s.firstName,
    lastName: s.lastName,
    phone: s.phone ?? '',
    parentPhone: s.parentPhone ?? undefined,
    email: s.email ?? undefined,
    groupIds: s.homeGroupId ? [s.homeGroupId] : [],
    homeGroupId: s.homeGroupId ?? undefined,
    monthlyPrice: Number(s.monthlyPrice),
    priceType: s.priceType,
    paymentDate: s.paymentDate ?? undefined,
    paidAmount: 0,
    lessons: s.lessons
      .map((l) => ({
        id: l.id,
        dayOfWeek: l.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        startTime: l.startTime,
        endTime: l.endTime,
        groupId: s.homeGroupId ?? '',
      }))
      .sort(
        (a, b) =>
          a.dayOfWeek - b.dayOfWeek ||
          a.startTime.localeCompare(b.startTime),
      ),
    status: (s.status as 'active' | 'paused' | 'finished') ?? 'active',
    note: s.note ?? undefined,
    missedLessons: parseMissedLessons(s.missedLessons),
  }));

  return mapped;
}

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

export async function getTeacherIndividualPayments(
  teacherId: string,
  monthKeys?: string[],
): Promise<PaymentRecord[]> {
  const rows = await prisma.individualPayment.findMany({
    where: {
      student: { teacherId },
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

export async function getStudentAssignments(
  teacherId: string,
  studentId: string,
): Promise<{ id: string; title: string; status: string; createdAt: string }[]> {
  const [submissions, targeted] = await Promise.all([
    prisma.submission.findMany({
      where: { studentId, assignment: { course: { teacherId } } },
      include: {
        assignment: { select: { id: true, title: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.assignment.findMany({
      where: { targetUserId: studentId, course: { teacherId } },
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const byId = new Map<string, { id: string; title: string; status: string; createdAt: string }>();

  for (const row of submissions) {
    byId.set(row.assignment.id, {
      id: row.assignment.id,
      title: row.assignment.title,
      status: row.status,
      createdAt: row.assignment.createdAt.toISOString(),
    });
  }

  for (const row of targeted) {
    if (byId.has(row.id)) continue;
    byId.set(row.id, {
      id: row.id,
      title: row.title,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    });
  }

  return Array.from(byId.values());
}