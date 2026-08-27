"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

/**
 * მასწავლებლის მიერ გაგზავნილი დავალების/ბარათის წაშლა
 */
export async function deleteTargetedAssignmentAction(assignmentId: string) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "ავტორიზაცია ვერ მოხერხდა" };
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: { select: { teacherId: true } },
      },
    });

    if (!assignment) {
      return { success: false, error: "დავალება ვერ მოიძებნა" };
    }

    if (assignment.course.teacherId !== session.user.id && session.user.role !== "ADMIN") {
      return { success: false, error: "არ გაქვთ ამ დავალების წაშლის უფლება" };
    }

    await prisma.assignment.delete({
      where: { id: assignmentId },
    });

    revalidatePath("/[locale]/teacher/students", "page");
    revalidatePath("/[locale]/teacher/homework", "page");
    revalidatePath("/[locale]/student/assignments", "page");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete assignment:", error);
    return { success: false, error: "დავალების წაშლა ვერ მოხერხდა" };
  }
}

/**
 * დავალების ჩაბარებულად მონიშვნა მასწავლებლის მხრიდან (Grade ჩანაწერის შექმნა/განახლება)
 */
export async function markAssignmentGradedAction(submissionIdOrAssignmentId: string) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "ავტორიზაცია ვერ მოხერხდა" };
    }

    // 1. ჯერ ვეძებთ Submission-ით
    const submission = await prisma.submission.findUnique({
      where: { id: submissionIdOrAssignmentId },
      include: {
        assignment: {
          include: {
            course: { select: { teacherId: true } },
          },
        },
      },
    });

    if (submission) {
      if (submission.assignment.course.teacherId !== session.user.id && session.user.role !== "ADMIN") {
        return { success: false, error: "არ გაქვთ ამ დავალების შეფასების უფლება" };
      }

      await prisma.submission.update({
        where: { id: submission.id },
        data: { status: "RETURNED" },
      });

      await prisma.grade.upsert({
        where: { submissionId: submission.id },
        create: {
          submissionId: submission.id,
          graderId: session.user.id,
          score: 100,
          maxScore: 100,
          comment: "ჩაბარებულია",
        },
        update: {
          graderId: session.user.id,
          score: 100,
          comment: "ჩაბარებულია",
        },
      });
    } else {
      // 2. თუ Assignment ID გადმოეცა
      const assignment = await prisma.assignment.findUnique({
        where: { id: submissionIdOrAssignmentId },
        include: {
          course: { select: { teacherId: true } },
          submissions: true,
        },
      });

      if (!assignment) {
        return { success: false, error: "ჩანაწერი ვერ მოიძებნა" };
      }

      if (assignment.course.teacherId !== session.user.id && session.user.role !== "ADMIN") {
        return { success: false, error: "არ გაქვთ ამ დავალების შეფასების უფლება" };
      }

      // ვანახლებთ ყველა submission-ს და ვანიჭებთ ჩაბარებულის სტატუსს
      for (const sub of assignment.submissions) {
        await prisma.submission.update({
          where: { id: sub.id },
          data: { status: "RETURNED" },
        });

        await prisma.grade.upsert({
          where: { submissionId: sub.id },
          create: {
            submissionId: sub.id,
            graderId: session.user.id,
            score: 100,
            maxScore: 100,
            comment: "ჩაბარებულია",
          },
          update: {
            graderId: session.user.id,
            score: 100,
            comment: "ჩაბარებულია",
          },
        });
      }
    }

    revalidatePath("/[locale]/teacher/students", "page");
    revalidatePath("/[locale]/student/assignments", "page");

    return { success: true };
  } catch (error) {
    console.error("Failed to mark assignment as graded:", error);
    return { success: false, error: "სტატუსის განახლება ვერ მოხერხდა" };
  }
}