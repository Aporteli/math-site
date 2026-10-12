'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';
import { parseMeetUrl, parseMiroBoardId } from '@/lib/lesson-room/links';
import { decryptMeetRefreshToken } from '@/lib/lesson-room/meet-token-crypto';
import { createMeetSpace, createMiroBoard, meetClientConfigured, miroApiConfigured } from '@/lib/lesson-room/providers';

export interface LessonRoomView {
  meetUrl: string | null;
  miroBoardId: string | null;
  canWrite: boolean;
  meetApiReady: boolean;
  miroApiReady: boolean;
}

type ActionResult = { ok: true; room: LessonRoomView } | { ok: false; error: string };

type CourseAccess = {
  canRead: boolean;
  canWrite: boolean;
  userId: string | null;
  teacherId: string | null;
};

async function resolveAccess(courseId: string): Promise<CourseAccess> {
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  if (!userId) return { canRead: false, canWrite: false, userId: null, teacherId: null };

  const role = (session?.user as { role?: string } | undefined)?.role;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { teacherId: true },
  });
  if (!course) return { canRead: false, canWrite: false, userId, teacherId: null };
  if (course.teacherId === userId || role === 'ADMIN') {
    return { canRead: true, canWrite: true, userId, teacherId: course.teacherId };
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: { courseId, userId, status: 'ACTIVE' },
    select: { id: true },
  });
  return { canRead: Boolean(enrollment), canWrite: false, userId, teacherId: course.teacherId };
}

async function teacherCanCreateMeet(userId: string | null, teacherId: string | null): Promise<boolean> {
  if (!userId || userId !== teacherId || !meetClientConfigured()) return false;
  const credential = await prisma.teacherMeetCredential.findUnique({
    where: { userId },
    select: { userId: true },
  });
  return Boolean(credential);
}

async function readRoom(courseId: string, access: CourseAccess): Promise<LessonRoomView> {
  const record = await prisma.courseLessonRoom.findUnique({
    where: { courseId },
    select: { meetUrl: true, miroBoardId: true },
  });
  return {
    meetUrl: record?.meetUrl ?? null,
    miroBoardId: record?.miroBoardId ?? null,
    canWrite: access.canWrite,
    meetApiReady: await teacherCanCreateMeet(access.userId, access.teacherId),
    miroApiReady: access.canWrite && miroApiConfigured(),
  };
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

export async function getLessonRoomAction(courseId: string): Promise<ActionResult> {
  try {
    const access = await resolveAccess(courseId);
    if (!access.canRead) return { ok: false, error: 'ამ გაკვეთილზე წვდომა არ გაქვთ.' };
    return { ok: true, room: await readRoom(courseId, access) };
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
    return { ok: true, room: await readRoom(courseId, access) };
  } catch (error) {
    console.error('Failed to save lesson links', error);
    return { ok: false, error: 'ბმულის შენახვა ვერ მოხერხდა.' };
  }
}

async function savedMeetRoom(courseId: string, access: CourseAccess): Promise<LessonRoomView | null> {
  const saved = await prisma.courseLessonRoom.findUnique({
    where: { courseId },
    select: { meetUrl: true },
  });
  if (!saved?.meetUrl) return null;
  return readRoom(courseId, access);
}

async function persistMeetIfAbsent(
  courseId: string,
  created: { meetUrl: string; meetSpaceName: string },
): Promise<void> {
  const claim = () =>
    prisma.courseLessonRoom.updateMany({
      where: { courseId, meetUrl: null },
      data: { meetUrl: created.meetUrl, meetSpaceName: created.meetSpaceName },
    });

  if ((await claim()).count === 1) return;

  const current = await prisma.courseLessonRoom.findUnique({
    where: { courseId },
    select: { meetUrl: true },
  });
  if (current?.meetUrl) return;
  if (current) {
    await claim();
    return;
  }

  try {
    await prisma.courseLessonRoom.create({
      data: {
        courseId,
        meetUrl: created.meetUrl,
        meetSpaceName: created.meetSpaceName,
      },
    });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    await claim();
  }
}

export async function createLessonMeetAction(
  courseId: string,
  options?: { replace?: boolean },
): Promise<ActionResult> {
  try {
    const access = await resolveAccess(courseId);
    const teacherId = access.teacherId;
    if (!access.userId || !teacherId || access.userId !== teacherId) {
      return { ok: false, error: 'Meet-ის შექმნა მხოლოდ მასწავლებელს შეუძლია.' };
    }

    const replace = options?.replace === true;
    if (!replace) {
      const existing = await savedMeetRoom(courseId, access);
      if (existing) return { ok: true, room: existing };
    }

    const credential = await prisma.teacherMeetCredential.findUnique({
      where: { userId: teacherId },
      select: { refreshTokenEnc: true },
    });
    if (!credential) return { ok: false, error: 'ჯერ დააკავშირეთ თქვენი Google Meet ანგარიში.' };

    let refreshToken: string;
    try {
      refreshToken = decryptMeetRefreshToken(credential.refreshTokenEnc);
    } catch (error) {
      console.error('MEET_TOKEN_DECRYPT_FAILED', error instanceof Error ? error.name : 'Error');
      return { ok: false, error: 'Google Meet-ის შექმნა ვერ მოხერხდა.' };
    }

    const created = await createMeetSpace(refreshToken);
    if (!created.ok) return { ok: false, error: created.error };

    if (replace) {
      await prisma.courseLessonRoom.upsert({
        where: { courseId },
        update: { meetUrl: created.meetUrl, meetSpaceName: created.meetSpaceName },
        create: {
          courseId,
          meetUrl: created.meetUrl,
          meetSpaceName: created.meetSpaceName,
        },
      });
    } else {
      await persistMeetIfAbsent(courseId, created);
    }
    const room = await savedMeetRoom(courseId, access);
    if (!room) return { ok: false, error: 'Google Meet-ის შექმნა ვერ მოხერხდა.' };
    return { ok: true, room };
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
    return { ok: true, room: await readRoom(courseId, access) };
  } catch (error) {
    console.error('Failed to create Miro board', error);
    return { ok: false, error: 'Miro დაფის შექმნა ვერ მოხერხდა.' };
  }
}
