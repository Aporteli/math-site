"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";

export interface StudentHomeworkGroup {
  student: {
    id: string;
    name: string;
    email: string | null;
    imageUrl?: string | null;
  };
  submissions: {
    id: string;
    status: string;
    attachmentUrl?: string | null;
    submittedAt?: Date | null;
    createdAt: Date;
    grade?: {
      score: number;
      comment?: string | null;
    } | null;
    assignment: {
      id: string;
      title: string;
      promptTex: string;
      topic?: string;
      difficulty?: string;
      courseTitle: string;
    };
  }[];
}

export async function getTeacherHomeworkSubmissionsAction(): Promise<StudentHomeworkGroup[]> {
  try {
    const session = await requireRole("ka", ["TEACHER", "ADMIN"]);

    // მასწავლებლის კურსებზე არსებული ყველა ჩაბარება
    const submissions = await prisma.submission.findMany({
      where: {
        assignment: {
          course: {
            teacherId: session.user.id,
          },
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
        grade: true,
        assignment: {
          include: {
            course: {
              select: { title: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // დავაჯგუფოთ სტუდენტების მიხედვით
    const studentMap = new Map<string, StudentHomeworkGroup>();

    for (const sub of submissions) {
      const studentId = sub.student.id;
      const payload = (sub.assignment.customPayload as Record<string, any>) || {};

      const formattedSub = {
        id: sub.id,
        status: sub.status,
        attachmentUrl: sub.attachmentUrl,
        submittedAt: sub.submittedAt,
        createdAt: sub.createdAt,
        grade: sub.grade
          ? {
              score: Number(sub.grade.score),
              comment: sub.grade.comment,
            }
          : null,
        assignment: {
          id: sub.assignment.id,
          title: sub.assignment.title,
          promptTex: payload.promptTex || payload.text || sub.assignment.instructions || "",
          topic: payload.topic || "მათემატიკა",
          difficulty: payload.difficulty || "medium",
          courseTitle: sub.assignment.course?.title || "ზოგადი კურსი",
        },
      };

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student: {
            id: sub.student.id,
            name: sub.student.name || "სახელის გარეშე",
            email: sub.student.email,
            imageUrl: sub.student.imageUrl,
          },
          submissions: [formattedSub],
        });
      } else {
        studentMap.get(studentId)!.submissions.push(formattedSub);
      }
    }

    return Array.from(studentMap.values());
  } catch (error) {
    console.error("Failed to load teacher homework submissions:", error);
    return [];
  }
}

export async function gradeSubmissionAction({
  submissionId,
  score,
  comment,
}: {
  submissionId: string;
  score: number;
  comment?: string;
}) {
  try {
    const session = await requireRole("ka", ["TEACHER", "ADMIN"]);

    await prisma.grade.upsert({
      where: { submissionId },
      update: {
        score,
        comment,
        graderId: session.user.id,
        gradedAt: new Date(),
      },
      create: {
        submissionId,
        score,
        maxScore: 10,
        comment,
        graderId: session.user.id,
        gradedAt: new Date(),
      },
    });

    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "RETURNED" },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to grade submission:", error);
    return { success: false, error: "შეფასების შენახვა ვერ მოხერხდა" };
  }
}