"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { revalidatePath } from "next/cache";

export async function joinClassWithCodeAction(inviteCode: string) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;

    if (!email) {
      return { success: false, error: "ავტორიზაცია არ გაქვთ გავლილი" };
    }

    const code = inviteCode.trim();
    if (!code) {
      return { success: false, error: "გთხოვთ შეიყვანოთ კოდი" };
    }

    // 1. ვპოულობთ მომხმარებელს მეილით
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return { success: false, error: "მომხმარებელი ვერ მოიძებნა" };
    }

    // 2. ვეძებთ კურსს ამ კოდით
    const course = await prisma.course.findFirst({
      where: {
        inviteCode: code,
      },
    });

    if (!course) {
      return { success: false, error: "კლასის კოდი არასწორია" };
    }

    // 3. ვამოწმებთ Enrollment-ს
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
    });

    if (!existingEnrollment) {
      await prisma.enrollment.create({
        data: {
          userId: user.id,
          courseId: course.id,
          status: "ACTIVE",
        },
      });
    }

    // 4. ვუცვლით როლს STUDENT-ზე
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "STUDENT" },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("შეცდომა კლასში გაწევრიანებისას:", error);
    return { success: false, error: "სისტემური შეცდომა, სცადეთ მოგვიანებით" };
  }
}