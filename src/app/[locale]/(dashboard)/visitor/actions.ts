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

    const normalizedEmail = email.trim().toLowerCase();

    // 1. მომხმარებლის მოძიება ბაზაში
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return { success: false, error: "მომხმარებელი ვერ მოიძებნა" };
    }

    // 2. კურსის მოძიება კოდით
    const course = await prisma.course.findFirst({
      where: {
        inviteCode: code,
      },
    });

    if (!course) {
      return { success: false, error: "კლასის კოდი არასწორია" };
    }

    // 3. Enrollment-ის შემოწმება და შექმნა
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

    // 4. როლის განახლება STUDENT-ად (თუ არ არის ADMIN)
    if (user.role !== "ADMIN") {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "STUDENT" },
      });
    }

    // ასუფთავებს მთლიანი საიტის ქეშს, რათა როლის ცვლილება მყისიერად აისახოს
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("შეცდომა კლასში გაწევრიანებისას:", error);
    return { success: false, error: "სისტემური შეცდომა, სცადეთ მოგვიანებით" };
  }
}