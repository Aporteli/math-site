"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { AssignmentStatus, AssignmentType } from "@prisma/client";

export interface StudentData {
  id: string;
  name: string;
  grade?: string;
}

export interface ClassData {
  id: string;
  name: string;
  studentCount: number;
}

export interface ProblemPayloadInput {
  id?: string;
  topic?: string;
  difficulty?: string;
  promptTex: string;
  solutionTex?: string;
  templateId?: string;
}

/**
 * 1. მოსწავლეების სიის წამოღება
 */
export async function getStudentsAction(): Promise<StudentData[]> {
  try {
    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return students.map((s) => ({
      id: s.id,
      name: s.name || "სახელის გარეშე",
      grade: "მოსწავლე",
    }));
  } catch (error) {
    console.error("Failed to fetch students:", error);
    return [];
  }
}

/**
 * 2. მასწავლებლის კლასების (კურსების) სიის წამოღება
 */
export async function getTeacherClassesAction(): Promise<ClassData[]> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return [];

    const courses = await prisma.course.findMany({
      where: {
        teacherId: session.user.id,
      },
      include: {
        _count: {
          select: {
            enrollments: {
              where: {
                user: { role: "STUDENT" },
                status: "ACTIVE",
              },
            },
          },
        },
      },
      orderBy: { title: "asc" },
    });

    return courses.map((c) => ({
      id: c.id,
      name: c.title,
      studentCount: c._count.enrollments,
    }));
  } catch (error) {
    console.error("Failed to fetch classes:", error);
    return [];
  }
}

/**
 * 3. ამოცანის ინდივიდუალურად გაგზავნა კონკრეტულ მოსწავლესთან (საჭიროა TeacherStudentsWorkspace-სთვის)
 */
export async function sendProblemToStudentAction({
  studentId,
  instructions,
  problem,
}: {
  studentId: string;
  instructions?: string;
  problem: ProblemPayloadInput;
}) {
  try {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: studentId,
        status: "ACTIVE",
      },
      select: { courseId: true },
    });

    let courseId = enrollment?.courseId;
    if (!courseId) {
      const anyCourse = await prisma.course.findFirst({
        select: { id: true },
      });
      if (!anyCourse) {
        return { success: false, error: "სისტემაში კურსი არ მოიძებნა" };
      }
      courseId = anyCourse.id;
    }

    const assignment = await prisma.assignment.create({
      data: {
        courseId: courseId,
        targetUserId: studentId,
        type: AssignmentType.PROBLEM,
        status: AssignmentStatus.PUBLISHED,
        publishedAt: new Date(),
        title: problem.topic ? `ამოცანა: ${problem.topic}` : "ინდივიდუალური ამოცანა",
        instructions: instructions?.trim() || "გთხოვთ ამოხსნათ მოცემული ამოცანა.",
        customPayload: {
          problemId: problem.id,
          promptTex: problem.promptTex,
          topic: problem.topic,
          difficulty: problem.difficulty,
          templateId: problem.templateId,
        },
      },
    });

    await prisma.submission.create({
      data: {
        assignmentId: assignment.id,
        studentId: studentId,
        status: "DRAFT",
      },
    });

    return { success: true, assignmentId: assignment.id };
  } catch (error) {
    console.error("Failed to send problem to student:", error);
    return { success: false, error: "ამოცანის გაგზავნა ვერ მოხერხდა" };
  }
}

/**
 * 4. ამოცანის გაგზავნა მთლიან კლასთან (საჭიროა ProblemCardMenu-სთვის)
 */
export async function sendProblemToClassAction({
  courseId,
  instructions,
  problem,
}: {
  courseId: string;
  instructions?: string;
  problem: ProblemPayloadInput;
}) {
  try {
    const assignment = await prisma.assignment.create({
      data: {
        courseId: courseId,
        targetUserId: null, // null ნიშნავს მთელ კლასს
        type: AssignmentType.PROBLEM,
        status: AssignmentStatus.PUBLISHED,
        publishedAt: new Date(),
        title: problem.topic ? `ამოცანა: ${problem.topic}` : "საკლასო ამოცანა",
        instructions: instructions?.trim() || "გთხოვთ ამოხსნათ მოცემული ამოცანა.",
        customPayload: {
          problemId: problem.id,
          promptTex: problem.promptTex,
          topic: problem.topic,
          difficulty: problem.difficulty,
          templateId: problem.templateId,
        },
      },
    });

    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: courseId,
        status: "ACTIVE",
        user: { role: "STUDENT" },
      },
      select: { userId: true },
    });

    if (enrollments.length > 0) {
      await prisma.submission.createMany({
        data: enrollments.map((e) => ({
          assignmentId: assignment.id,
          studentId: e.userId,
          status: "DRAFT",
        })),
        skipDuplicates: true,
      });
    }

    return { success: true, assignmentId: assignment.id };
  } catch (error) {
    console.error("Failed to send problem to class:", error);
    return { success: false, error: "კლასისთვის ამოცანის გაგზავნა ვერ მოხერხდა" };
  }
}

/**
 * 5. მოსწავლისთვის მისი კუთვნილი დავალებების წამოღება
 */
export async function getStudentAssignmentsAction() {
  try {
    const session = await getSession();
    if (!session?.user?.id) return [];

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: session.user.id, status: "ACTIVE" },
      select: { courseId: true },
    });
    const enrolledCourseIds = enrollments.map((e) => e.courseId);

    const rawAssignments = await prisma.assignment.findMany({
      where: {
        OR: [
          { targetUserId: session.user.id },
          { targetUserId: null, courseId: { in: enrolledCourseIds } },
        ],
      },
      include: {
        course: { select: { title: true } },
        submissions: {
          where: { studentId: session.user.id },
          include: { grade: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return rawAssignments.map((a) => {
      const payload = (a.customPayload as Record<string, any>) || {};
      const submission = a.submissions[0];

      let problemStatus: "notStarted" | "uploaded" | "submitted" | "graded" = "notStarted";
      if (submission?.grade) {
        problemStatus = "graded";
      } else if (submission?.status === "SUBMITTED") {
        problemStatus = "submitted";
      } else if (submission?.attachmentUrl) {
        problemStatus = "uploaded";
      }

      return {
        id: a.id,
        title: a.title,
        course: a.course?.title || "ზოგადი კურსი",
        dueLabel: a.dueAt ? new Date(a.dueAt).toLocaleDateString("ka-GE") : "ვადა შეუზღუდავია",
        overdue: a.dueAt ? new Date(a.dueAt) < new Date() : false,
        note: a.instructions || undefined,
        instructions: a.instructions || undefined,
        problems: [
          {
            id: a.id,
            topic: payload.topic || "მათემატიკა",
            difficulty: (payload.difficulty || "medium") as "easy" | "medium" | "hard" | "olympiad",
            promptTex: payload.promptTex || payload.text || a.instructions || "",
            status: problemStatus,
            fileName: submission?.attachmentUrl || undefined,
            grade: submission?.grade ? Number(submission.grade.score) : undefined,
            feedback: submission?.grade?.comment || undefined,
          },
        ],
      };
    });
  } catch (error) {
    console.error("Failed to load student assignments:", error);
    return [];
  }
}