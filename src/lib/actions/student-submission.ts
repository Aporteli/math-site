"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { SubmissionStatus } from "@prisma/client";

export async function submitStudentHomeworkAction({
  assignmentId,
  attachmentUrl,
}: {
  assignmentId: string;
  attachmentUrl: string; // Base64 ან ფაილის ლინკი
}) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "ავტორიზაცია ვერ მოხერხდა" };
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return { success: false, error: "დავალება ვერ მოიძებნა" };
    }

    const submission = await prisma.submission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: session.user.id,
        },
      },
      update: {
        attachmentUrl,
        status: SubmissionStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      create: {
        assignmentId,
        studentId: session.user.id,
        attachmentUrl,
        status: SubmissionStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });

    return { success: true, submissionId: submission.id };
  } catch (error) {
    console.error("Failed to submit student homework:", error);
    return { success: false, error: "დავალების გაგზავნა ვერ მოხერხდა" };
  }
}