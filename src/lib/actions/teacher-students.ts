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

    // ვამოწმებთ, რომ წაშლის უფლება აქვს ამ კურსის მასწავლებელს ან ადმინს
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

    // ბაზიდან წაშლა (Submissions, Grades და Comments წაიშლება Cascade-ით)
    await prisma.assignment.delete({
      where: { id: assignmentId },
    });

    revalidatePath("/[locale]/teacher/students", "page");
    revalidatePath("/[locale]/teacher/homework", "page");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete assignment:", error);
    return { success: false, error: "დავალების წაშლა ვერ მოხერხდა" };
  }
}