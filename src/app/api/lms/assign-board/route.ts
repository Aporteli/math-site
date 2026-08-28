import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const assignBoardSchema = z.object({
  courseId: z.string().min(1),
  studentId: z.string().min(1),
  title: z.string().min(1).max(160),
  content: z
    .object({
      elements: z.array(z.unknown()),
    })
    .passthrough(),
});

/**
 * მასწავლებელი არჩეულ მოსწავლეს უგზავნის მიმდინარე დაფის გვერდს.
 * შენახული ჩანაწერი შემდეგ ჩნდება მოსწავლის პირად დაფაზე.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const userId = session?.user?.id;
    const role = session?.user?.role;

    if (!userId || (role !== "TEACHER" && role !== "ADMIN")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = assignBoardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid payload" },
        { status: 400 },
      );
    }

    const { courseId, studentId, title, content } = parsed.data;

    // უსაფრთხოება: მხოლოდ კურსის მფლობელ მასწავლებელს (ან ადმინს) შეუძლია დავალების შექმნა.
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    if (course.teacherId !== userId && role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Not your course" },
        { status: 403 },
      );
    }

    // მოსწავლე უნდა იყოს ამ კურსზე ჩარიცხული.
    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId, userId: studentId, status: "ACTIVE" },
      select: { id: true },
    });

    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: "Student is not enrolled in this course" },
        { status: 400 },
      );
    }

    const assignment = await prisma.whiteboardAssignment.create({
      data: {
        courseId,
        studentId,
        teacherId: userId,
        title,
        content: JSON.parse(JSON.stringify(content)) as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, id: assignment.id });
  } catch (error) {
    console.error("ASSIGN_BOARD_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
