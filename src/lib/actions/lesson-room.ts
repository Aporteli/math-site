'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';
import { parseMeetUrl, parseMiroBoardId } from '@/lib/lesson-room/links';
import { createMeetSpace, createMiroBoard, meetApiConfigured, miroApiConfigured } from '@/lib/lesson-room/providers';

export interface LessonRoomView {
  meetUrl: string | null;
  miroBoardId: string | null;
  canWrite: boolean;
  meetApiReady: boolean;
  miroApiReady: boolean;
}

type ActionResult = { ok: true; room: LessonRoomView } | { ok: false; error: string };

async function resolveAccess(courseId: string): Promise<{ canRead: boolean; canWrite: boolean }> {
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  if (!userId) return { canRead: false, canWrite: false };

  const role = (session?.user as { role?: string } | undefined)?.role;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { teacherId: true },
  });
  if (!course) return { canRead: false, canWrite: false };
  if (course.teacherId === userId || role === 'ADMIN') return { canRead: true, canWrite: true };

  const enrollment = await prisma.enrollment.findFirst({
    where: { courseId, userId, status: 'ACTIVE' },
    select: { id: true },
  });
  return { canRead: Boolean(enrollment), canWrite: false };
}

async function readRoom(courseId: string, canWrite: boolean): Promise<LessonRoomView> {
  const record = await prisma.courseLessonRoom.findUnique({
    where: { courseId },
    select: { meetUrl: true, miroBoardId: true },
  });
  return {
    meetUrl: record?.meetUrl ?? null,
    miroBoardId: record?.miroBoardId ?? null,
    canWrite,
    meetApiReady: canWrite && meetApiConfigured(),
    miroApiReady: canWrite && miroApiConfigured(),
  };
}

export async function getLessonRoomAction(courseId: string): Promise<ActionResult> {
  try {
    const access = await resolveAccess(courseId);
    if (!access.canRead) return { ok: false, error: 'ამ გაკვეთილზე წვდომა არ გაქვთ.' };
    return { ok: true, room: await readRoom(courseId, access.canWrite) };
  } catch (error) {
    console.error('Failed to load lesson room', error);
    return { ok: false, error: 'გაკვეთილის ჩატვირთვა ვერ მოხერხდა.' };
  }
}

export async function saveLessonLinksAction(
  courseId: string,
  input: { meetUrl?: string; miroBoard?: string },
): Promise<ActionResult> {
  try {
    const access = await resolveAccess(courseId);
    if (!access.canWrite) return { ok: false, error: 'ბმულის შენახვა მხოლოდ მასწავლებელს შეუძლია.' };

    const data: { meetUrl?: string; miroBoardId?: string } = {};
    if (typeof input.meetUrl === 'string' && input.meetUrl.trim()) {
      const meetUrl = parseMeetUrl(input.meetUrl);
      if (!meetUrl) return { ok: false, error: 'ჩაწერეთ სრული https://meet.google.com ბმული.' };
      data.meetUrl = meetUrl;
    }
    if (typeof input.miroBoard === 'string' && input.miroBoard.trim()) {
      const miroBoardId = parseMiroBoardId(input.miroBoard);
      if (!miroBoardId) return { ok: false, error: 'ჩაწერეთ Miro დაფის ბმული ან დაფის ID.' };
      data.miroBoardId = miroBoardId;
    }
    if (!data.meetUrl && !data.miroBoardId) {
      return { ok: false, error: 'შეინახეთ Meet-ის ან Miro-ს ბმული.' };
    }

    await prisma.courseLessonRoom.upsert({
      where: { courseId },
      update: data,
      create: { courseId, ...data },
    });
    return { ok: true, room: await readRoom(courseId, true) };
  } catch (error) {
    console.error('Failed to save lesson links', error);
    return { ok: false, error: 'ბმულის შენახვა ვერ მოხერხდა.' };
  }
}

export async function createLessonMeetAction(courseId: string): Promise<ActionResult> {
  try {
    const access = await resolveAccess(courseId);
    if (!access.canWrite) return { ok: false, error: 'Meet-ის შექმნა მხოლოდ მასწავლებელს შეუძლია.' };

    const created = await createMeetSpace();
    if (!created.ok) return { ok: false, error: created.error };

    await prisma.courseLessonRoom.upsert({
      where: { courseId },
      update: { meetUrl: created.meetUrl, meetSpaceName: created.meetSpaceName },
      create: { courseId, meetUrl: created.meetUrl, meetSpaceName: created.meetSpaceName },
    });
    return { ok: true, room: await readRoom(courseId, true) };
  } catch (error) {
    console.error('Failed to create Meet space', error);
    return { ok: false, error: 'Google Meet-ის შექმნა ვერ მოხერხდა.' };
  }
}

export async function createLessonMiroAction(courseId: string): Promise<ActionResult> {
  try {
    const access = await resolveAccess(courseId);
    if (!access.canWrite) return { ok: false, error: 'Miro დაფის შექმნა მხოლოდ მასწავლებელს შეუძლია.' };

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true },
    });
    if (!course) return { ok: false, error: 'კურსი ვერ მოიძებნა.' };

    const created = await createMiroBoard(course.title);
    if (!created.ok) return { ok: false, error: created.error };

    await prisma.courseLessonRoom.upsert({
      where: { courseId },
      update: { miroBoardId: created.miroBoardId },
      create: { courseId, miroBoardId: created.miroBoardId },
    });
    return { ok: true, room: await readRoom(courseId, true) };
  } catch (error) {
    console.error('Failed to create Miro board', error);
    return { ok: false, error: 'Miro დაფის შექმნა ვერ მოხერხდა.' };
  }
}
