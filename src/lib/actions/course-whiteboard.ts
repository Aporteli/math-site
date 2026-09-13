"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export interface CourseWhiteboardData {
  pages: unknown[][];
  currentPageIndex: number;
}

/**
 * Determines whether the current user may read the course whiteboard and,
 * separately, whether they are allowed to write (teacher/admin) to it.
 */
async function resolveWhiteboardAccess(
  courseId: string,
): Promise<{ userId: string | null; canRead: boolean; canWrite: boolean }> {
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  if (!userId) return { userId: null, canRead: false, canWrite: false };

  const role = (session?.user as { role?: string } | undefined)?.role;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { teacherId: true },
  });
  if (!course) return { userId, canRead: false, canWrite: false };

  const isTeacher = course.teacherId === userId || role === "ADMIN";
  if (isTeacher) return { userId, canRead: true, canWrite: true };

  const enrollment = await prisma.enrollment.findFirst({
    where: { courseId, userId, status: "ACTIVE" },
    select: { id: true },
  });

  return { userId, canRead: !!enrollment, canWrite: false };
}

export async function getCourseWhiteboardAction(
  courseId: string,
): Promise<CourseWhiteboardData | null> {
  try {
    const { canRead } = await resolveWhiteboardAccess(courseId);
    if (!canRead) return null;

    const record = await prisma.courseWhiteboard.findUnique({
      where: { courseId },
      select: { pages: true, currentPageIndex: true },
    });
    if (!record || !Array.isArray(record.pages)) return null;

    return {
      pages: record.pages as unknown[][],
      currentPageIndex:
        typeof record.currentPageIndex === "number" ? record.currentPageIndex : 0,
    };
  } catch (error) {
    console.error("Failed to load course whiteboard:", error);
    return null;
  }
}

export async function saveCourseWhiteboardAction(
  courseId: string,
  pages: unknown,
  currentPageIndex: number,
): Promise<{ success: boolean }> {
  try {
    const { canWrite } = await resolveWhiteboardAccess(courseId);
    if (!canWrite || !Array.isArray(pages)) return { success: false };

    const safePages = JSON.parse(JSON.stringify(pages)) as Prisma.InputJsonValue;
    const safeIndex = Number.isFinite(currentPageIndex) ? currentPageIndex : 0;

    await prisma.courseWhiteboard.upsert({
      where: { courseId },
      update: { pages: safePages, currentPageIndex: safeIndex },
      create: { courseId, pages: safePages, currentPageIndex: safeIndex },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to save course whiteboard:", error);
    return { success: false };
  }
}
