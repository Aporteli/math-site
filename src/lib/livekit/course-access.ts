import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export interface CourseAccess {
  userId: string;
  userName: string;
  userRole: string;
  isTeacher: boolean;
  teacherId: string;
}

export async function loadCourseAccess(
  courseId: string,
): Promise<{ ok: true; access: CourseAccess } | { ok: false; status: number; message: string }> {
  const session = await getSession();
  const userId = session?.user?.id;
  const userName = session?.user?.name || 'მომხმარებელი';
  const userRole = session?.user?.role ?? 'STUDENT';

  if (!userId) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { teacherId: true },
  });

  if (!course) {
    return { ok: false, status: 404, message: 'Course not found' };
  }

  const isTeacher = course.teacherId === userId || userRole === 'ADMIN';

  if (!isTeacher) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId, userId, status: 'ACTIVE' },
    });
    if (!enrollment) {
      return { ok: false, status: 403, message: 'Access denied for this course' };
    }
  }

  return {
    ok: true,
    access: { userId, userName, userRole, isTeacher, teacherId: course.teacherId },
  };
}
