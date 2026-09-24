'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export type VirtualEventSource = 'group' | 'individual';

export interface VirtualScheduleStudent {
  id: string;
  name: string;
}

export interface VirtualScheduleEvent {
  id: string;
  source: VirtualEventSource;
  students: VirtualScheduleStudent[];
  courseId?: string;
  courseTitle?: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startTime: string;
  endTime: string;
}

function sortStudents(students: VirtualScheduleStudent[]): VirtualScheduleStudent[] {
  return [...students].sort((a, b) => a.name.localeCompare(b.name, 'ka'));
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

    const individualLessons = await prisma.individualLesson.findMany({
      where: {
        student: { teacherId, status: 'active' },
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const grouped = new Map<string, VirtualScheduleEvent>();

    for (const lesson of groupLessons) {
      const courseId = lesson.enrollment.course.id;
      const key = `${courseId}|${lesson.dayOfWeek}|${lesson.startTime}|${lesson.endTime}`;
      const student: VirtualScheduleStudent = {
        id: lesson.enrollment.user.id,
        name: lesson.enrollment.user.name,
      };
      const existing = grouped.get(key);
      if (existing) {
        if (!existing.students.some((s) => s.id === student.id)) {
          existing.students.push(student);
        }
        continue;
      }
      grouped.set(key, {
        id: `schedule-group-${key}`,
        source: 'group',
        students: [student],
        courseId,
        courseTitle: lesson.enrollment.course.title,
        dayOfWeek: lesson.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
      });
    }

    const groupEvents = Array.from(grouped.values()).map((event) => ({
      ...event,
      students: sortStudents(event.students),
    }));

    const individualEvents: VirtualScheduleEvent[] = individualLessons.map((lesson) => ({
      id: `schedule-individual-${lesson.id}`,
      source: 'individual',
      students: [
        {
          id: lesson.student.id,
          name: `${lesson.student.firstName} ${lesson.student.lastName}`.trim(),
        },
      ],
      dayOfWeek: lesson.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
    }));

    return { success: true, events: [...groupEvents, ...individualEvents] };
  } catch (error) {
    console.error('Failed to load schedule lessons:', error);
    return {
      success: false,
      error: 'განრიგის ჩატვირთვა ვერ მოხერხდა',
      events: [],
    };
  }
}
