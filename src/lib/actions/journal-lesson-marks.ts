'use server';

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export interface JournalLessonMark {
  eventId: string;
  date: string;
  skippedStudentIds: string[];
  comment: string;
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export async function getJournalLessonMarksAction(): Promise<{
  success: boolean;
  error?: string;
  marks: JournalLessonMark[];
}> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized', marks: [] };
    }

    const rows = await prisma.journalLessonMark.findMany({
      where: { teacherId: session.user.id },
      select: { eventId: true, date: true, skippedStudentIds: true, comment: true },
    });

    return { success: true, marks: rows };
  } catch (error) {
    console.error('Failed to load journal lesson marks:', error);
    return { success: false, error: 'ჩანაწერების ჩატვირთვა ვერ მოხერხდა', marks: [] };
  }
}

export async function saveJournalLessonMarkAction(input: JournalLessonMark): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const eventId = input.eventId.trim();
    const date = input.date.trim();
    if (!eventId || eventId.length > 300 || !DATE_KEY.test(date)) {
      return { success: false, error: 'არასწორი მონაცემები' };
    }

    const skippedStudentIds = [...new Set(input.skippedStudentIds.map((id) => id.trim()).filter(Boolean))].slice(0, 80);
    const comment = input.comment.trim().slice(0, 240);
    const teacherId = session.user.id;

    if (skippedStudentIds.length === 0 && comment.length === 0) {
      await prisma.journalLessonMark.deleteMany({ where: { teacherId, eventId, date } });
      return { success: true };
    }

    await prisma.journalLessonMark.upsert({
      where: { teacherId_eventId_date: { teacherId, eventId, date } },
      create: { teacherId, eventId, date, skippedStudentIds, comment },
      update: { skippedStudentIds, comment },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to save journal lesson mark:', error);
    return { success: false, error: 'შენახვა ვერ მოხერხდა' };
  }
}
