"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { SubmissionStatus } from "@prisma/client";
import { resolveAttachmentUrl } from "@/lib/storage/blob";

/**
 * 1. მოსწავლის დავალების/პასუხის გაგზავნა
 */
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

    // Backend guard: a raw `data:image/...` canvas snapshot is uploaded to
    // Vercel Blob before the record is written, so only the public URL is
    // stored in `attachmentUrl`.
    const resolvedAttachmentUrl = await resolveAttachmentUrl(attachmentUrl);
    if (!resolvedAttachmentUrl) {
      return { success: false, error: "მიმაგრებული ფაილი ცარიელია" };
    }

    // შევამოწმოთ არსებობს თუ არა უკვე Submission ამ სტუდენტისთვის
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        assignmentId,
        studentId: session.user.id,
      },
    });

    let submission;
    if (existingSubmission) {
      submission = await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: {
          attachmentUrl: resolvedAttachmentUrl,
          status: SubmissionStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      });
    } else {
      submission = await prisma.submission.create({
        data: {
          assignmentId,
          studentId: session.user.id,
          attachmentUrl: resolvedAttachmentUrl,
          status: SubmissionStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      });
    }

    return { success: true, submissionId: submission.id };
  } catch (error) {
    console.error("Failed to submit student homework:", error);
    return { success: false, error: "დავალების გაგზავნა ვერ მოხერხდა" };
  }
}

/**
 * 2. მოსწავლის მიერ გაგზავნილი პასუხების გაუქმება, წაშლა და დარესეტება
 */
export async function withdrawStudentHomeworkAction({
  assignmentIds,
}: {
  assignmentIds: string[];
}) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "ავტორიზაცია ვერ მოხერხდა" };
    }

    if (!assignmentIds || assignmentIds.length === 0) {
      return { success: false, error: "დავალებები არ არის მითითებული" };
    }

    // ვპოულობთ და ვასუფთავებთ მოსწავლის submission-ებს მოცემული დავალებებისთვის
    await prisma.submission.updateMany({
      where: {
        studentId: session.user.id,
        assignmentId: { in: assignmentIds },
      },
      data: {
        attachmentUrl: null,
        status: SubmissionStatus.DRAFT,
        submittedAt: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to withdraw student homework:", error);
    return { success: false, error: "პასუხების წაშლა ვერ მოხერხდა" };
  }
}