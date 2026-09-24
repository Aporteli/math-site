'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export type VirtualEventSource = 'group' | 'individual';

export interface VirtualScheduleEvent {
  id: string;
  source: VirtualEventSource;
  studentId: string;
  studentName: string;
  courseId?: string;
  courseTitle?: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startTime: string;
  endTime: string;
}

export async function getScheduleLessonsAction(): Promise<{
  success: boolean;
  error?: string;
  events: VirtualScheduleEvent[];
}> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized', events: [] };
    }

    const teacherId = session.user.id;

    /* ─── ჯგუფური გაკვეთილები ─── */
    const groupLessons = await prisma.lessonSlot.findMany({
      where: {
        enrollment: {
          status: 'ACTIVE',
          course: { teacherId },
        },
      },
      include: {
        enrollment: {
          include: {
            user: { select: { id: true, name: true } },
            course: { select: { id: true, title: true } },
          },
        },
      },
    });

    /* ─── ინდივიდუალური გაკვეთილები ─── */
    const individualLessons = await prisma.individualLesson.findMany({
      where: {
        student: { teacherId, status: 'active' },
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const events: VirtualScheduleEvent[] = [
      ...groupLessons.map((l) => ({
        id: `schedule-group-${l.id}`,
        source: 'group' as const,
        studentId: l.enrollment.user.id,
        studentName: l.enrollment.user.name,
        courseId: l.enrollment.course.id,
        courseTitle: l.enrollment.course.title,
        dayOfWeek: l.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        startTime: l.startTime,
        endTime: l.endTime,
      })),
      ...individualLessons.map((l) => ({
        id: `schedule-individual-${l.id}`,
        source: 'individual' as const,
        studentId: l.student.id,
        studentName: `${l.student.firstName} ${l.student.lastName}`.trim(),
        dayOfWeek: l.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        startTime: l.startTime,
        endTime: l.endTime,
      })),
    ];

    return { success: true, events };
  } catch (error) {
    console.error('Failed to load schedule lessons:', error);
    return {
      success: false,
      error: 'განრიგის ჩატვირთვა ვერ მოხერხდა',
      events: [],
    };
  }
}