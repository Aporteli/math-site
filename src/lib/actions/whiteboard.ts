"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

const saveWhiteboardSchema = z.object({
  id: z.string().min(1),
  content: z
    .object({
      elements: z.array(z.unknown()),
    })
    .passthrough(),
});

export interface SaveWhiteboardResult {
  success: boolean;
  error?: string;
}

/**
 * მოსწავლე ინახავს მიღებულ დაფაზე შესრულებულ ცვლილებებს.
 */
export async function saveStudentWhiteboardAssignmentAction(input: {
  id: string;
  content: unknown;
}): Promise<SaveWhiteboardResult> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "unauthorized" };
    }

    const parsed = saveWhiteboardSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "invalid payload" };
    }

    const { id, content } = parsed.data;

    const existing = await prisma.whiteboardAssignment.findUnique({
      where: { id },
      select: { studentId: true },
    });

    if (!existing) {
      return { success: false, error: "not found" };
    }

    if (existing.studentId !== session.user.id && session.user.role !== "ADMIN") {
      return { success: false, error: "forbidden" };
    }

    await prisma.whiteboardAssignment.update({
      where: { id },
      data: {
        content: JSON.parse(JSON.stringify(content)) as Prisma.InputJsonValue,
        status: "IN_PROGRESS",
      },
    });

    revalidatePath("/[locale]/student/whiteboards", "page");

    return { success: true };
  } catch (error) {
    console.error("SAVE_WHITEBOARD_ERROR:", error);
    return { success: false, error: "failed" };
  }
}
