"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { YearGroup, EnrollmentStatus } from "@prisma/client";

export async function getAdminCoursesAction() {
  await requireRole("ka", ["ADMIN"]);
  try {
    const courses = await prisma.course.findMany({
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: courses };
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    return { success: false, error: "კურსების წამოღება ვერ მოხერხდა" };
  }
}

export async function getAdminTeachersAction() {
  await requireRole("ka", ["ADMIN"]);
  try {
    const teachers = await prisma.user.findMany({
      where: { role: { in: ["TEACHER", "ADMIN"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: teachers };
  } catch (error) {
    console.error("Failed to fetch teachers:", error);
    return { success: false, error: "მასწავლებლების წამოღება ვერ მოხერხდა" };
  }
}

export async function getAdminStudentsWithEnrollmentsAction() {
  await requireRole("ka", ["ADMIN"]);
  try {
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        email: true,
        enrollments: {
          select: {
            courseId: true,
            course: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return { success: true, data: students };
  } catch (error) {
    console.error("Failed to fetch students:", error);
    return { success: false, error: "მოსწავლეების წამოღება ვერ მოხერხდა" };
  }
}

export async function updateStudentEnrollmentsAction(studentId: string, courseIds: string[]) {
  await requireRole("ka", ["ADMIN"]);
  try {
    // წავშალოთ არსებული ჩარიცხვები
    await prisma.enrollment.deleteMany({
      where: { userId: studentId },
    });

    // დავამატოთ არჩეული ახალი კურსები
    if (courseIds.length > 0) {
      await prisma.enrollment.createMany({
        data: courseIds.map((courseId) => ({
          userId: studentId,
          courseId,
          status: EnrollmentStatus.ACTIVE,
        })),
        skipDuplicates: true,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update student enrollments:", error);
    return { success: false, error: "მოსწავლის კურსების განახლება ვერ მოხერხდა" };
  }
}

export async function createAdminCourseAction({
  title,
  teacherId,
  description,
  inviteCode,
  yearGroup = YearGroup.YEAR_10,
  locale = "ka",
}: {
  title: string;
  teacherId: string;
  description?: string;
  inviteCode?: string;
  yearGroup?: YearGroup;
  locale?: string;
}) {
  await requireRole("ka", ["ADMIN"]);
  try {
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const slug = `${baseSlug || "course"}-${Date.now().toString(36)}`;

    const cleanInviteCode = inviteCode?.trim() || null;

    if (cleanInviteCode) {
      const existing = await prisma.course.findUnique({
        where: { inviteCode: cleanInviteCode },
      });
      if (existing) {
        return { success: false, error: "ეს მოსაწვევი კოდი უკვე დაკავებულია" };
      }
    }

    const newCourse = await prisma.course.create({
      data: {
        title,
        slug,
        description: description || `${title} - სასწავლო კურსი`,
        inviteCode: cleanInviteCode,
        yearGroup,
        locale,
        teacherId,
      },
    });
    return { success: true, data: newCourse };
  } catch (error) {
    console.error("Failed to create course:", error);
    return { success: false, error: "კურსის შექმნა ვერ მოხერხდა" };
  }
}

export async function updateAdminCourseAction(
  id: string,
  data: {
    title: string;
    teacherId: string;
    description?: string;
    inviteCode?: string;
    yearGroup?: YearGroup;
  }
) {
  await requireRole("ka", ["ADMIN"]);
  try {
    const cleanInviteCode = data.inviteCode?.trim() || null;

    if (cleanInviteCode) {
      const existing = await prisma.course.findFirst({
        where: {
          inviteCode: cleanInviteCode,
          NOT: { id },
        },
      });
      if (existing) {
        return { success: false, error: "ეს მოსაწვევი კოდი უკვე დაკავებულია" };
      }
    }

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: {
        title: data.title,
        teacherId: data.teacherId,
        inviteCode: cleanInviteCode,
        ...(data.description ? { description: data.description } : {}),
        ...(data.yearGroup ? { yearGroup: data.yearGroup } : {}),
      },
    });
    return { success: true, data: updatedCourse };
  } catch (error) {
    console.error("Failed to update course:", error);
    return { success: false, error: "კურსის განახლება ვერ მოხერხდა" };
  }
}

export async function deleteAdminCourseAction(id: string) {
  await requireRole("ka", ["ADMIN"]);
  try {
    await prisma.course.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error("Failed to delete course:", error);
    return {
      success: false,
      error: "კურსის წაშლა ვერ მოხერხდა (შესაძლოა მასზე მიბმულია მოსწავლეები ან დავალებები)",
    };
  }
}