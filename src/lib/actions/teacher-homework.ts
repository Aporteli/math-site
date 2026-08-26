"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export interface StudentHomeworkGroup {
  student: {
    id: string;
    name: string;
    email?: string;
  };
  submissions: {
    id: string;
    status: string;
    submittedAt: string;
    attachmentUrl?: string | null;
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
    const session = await getSession();
    if (!session?.user?.id) return [];

    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        email: true,
        submissions: {
          include: {
            grade: true,
            assignment: {
              include: {
                course: { select: { title: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return students.map((s) => ({
      student: {
        id: s.id,
        name: s.name || "სახელის გარეშე",
        email: s.email || undefined,
      },
      submissions: s.submissions.map((sub) => {
        const payload = (sub.assignment.customPayload as Record<string, unknown>) || {};
        return {
          id: sub.id,
          status: sub.status,
          submittedAt: sub.createdAt.toISOString(),
          attachmentUrl: sub.attachmentUrl,
          grade: sub.grade
            ? {
                score: Number(sub.grade.score),
                comment: sub.grade.comment,
              }
            : null,
          assignment: {
            id: sub.assignment.id,
            title: sub.assignment.title,
            promptTex: String(payload.promptTex || payload.text || sub.assignment.instructions || ""),
            topic: typeof payload.topic === "string" ? payload.topic : undefined,
            difficulty: typeof payload.difficulty === "string" ? payload.difficulty : undefined,
            courseTitle: sub.assignment.course?.title || "ზოგადი კურსი",
          },
        };
      }),
    }));
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
    const session = await getSession();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    await prisma.grade.upsert({
      where: { submissionId },
      update: {
        score,
        comment: comment || null,
        graderId: session.user.id,
      },
      create: {
        submissionId,
        graderId: session.user.id,
        score,
        maxScore: 100,
        comment: comment || null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to grade submission:", error);
    return { success: false, error: "შეფასების შენახვა ვერ მოხერხდა" };
  }
}