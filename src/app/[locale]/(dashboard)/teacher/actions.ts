"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

// 1. ბარათის / ამოცანის შექმნა და გაგზავნა
export async function createAssignmentAction(formData: {
  title: string;
  type: "FLASHCARD" | "PROBLEM";
  courseId: string;
  targetUserId?: string;
  content?: any;
  instructions?: string;
}) {
  try {
    const session = await getSession();
    if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
      return { success: false, error: "წვდომა შეზღუდულია: მასწავლებლის ავტორიზაცია აუცილებელია" };
    }

    if (!formData.title || !formData.courseId) {
      return { success: false, error: "სათაური და კურსი სავალდებულოა" };
    }

    const assignment = await prisma.assignment.create({
      data: {
        title: formData.title,
        type: formData.type || "FLASHCARD",
        courseId: formData.courseId,
        targetUserId: formData.targetUserId || null,
        customPayload: formData.content ? JSON.parse(JSON.stringify(formData.content)) : {},
        instructions: formData.instructions || null,
      },
      select: {
        id: true,
      },
    });

    revalidatePath("/[locale]/(dashboard)/teacher/students", "page");
    return { success: true, assignmentId: assignment.id };
  } catch (error: any) {
    console.error("შეცდომა createAssignmentAction-ში:", error);
    return { 
      success: false, 
      error: error?.message || "დავალების გაგზავნა ვერ მოხერხდა" 
    };
  }
}

// 2. კომენტარის დამატება
export async function addCommentAction(assignmentId: string, content: string) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "ავტორიზაცია არ გაქვთ" };
    }

    if (!content?.trim() || !assignmentId) {
      return { success: false, error: "ტექსტი ცარიელია" };
    }

    const comment = await prisma.comment.create({
      data: {
        body: content.trim(),
        assignmentId,
        authorId: session.user.id,
      },
      include: {
        author: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    revalidatePath("/[locale]/(dashboard)/teacher/students", "page");

    // ვაბრუნებთ მხოლოდ სუფთა JSON ობიექტს
    return {
      success: true,
      comment: {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        author: {
          name: comment.author.name,
          role: comment.author.role,
        },
      },
    };
  } catch (error: any) {
    console.error("შეცდომა addCommentAction-ში:", error);
    return { 
      success: false, 
      error: error?.message || "კომენტარის დამატება ვერ მოხერხდა" 
    };
  }
}