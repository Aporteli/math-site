"use server";

import type { Prisma, Role } from "@prisma/client";
import type { Locale } from "@/i18n/config";
import { isOwnerEmail, isUserRole, type UserRole } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  coursesTaught: number;
  enrollments: number;
  isSelf: boolean;
  isOwner: boolean;
  isLastAdmin: boolean;
};

export type RoleUpdateError =
  | "invalid_role"
  | "not_found"
  | "self"
  | "owner"
  | "last_admin"
  | "failed";

export type UserDeleteError = "not_found" | "self" | "owner" | "last_admin" | "failed";

function withLastAdmin(users: Omit<ManagedUser, "isLastAdmin">[]): ManagedUser[] {
  const adminCount = users.filter((user) => user.role === "ADMIN").length;
  return users.map((user) => ({
    ...user,
    isLastAdmin: user.role === "ADMIN" && adminCount <= 1,
  }));
}

export async function listAdminUsersAction(locale: Locale) {
  const session = await requireRole(locale, ["ADMIN"]);

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        _count: { select: { coursesTaught: true, enrollments: true } },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    const data = withLastAdmin(
      users.flatMap((user) => {
        if (!isUserRole(user.role)) return [];
        return [
          {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            coursesTaught: user._count.coursesTaught,
            enrollments: user._count.enrollments,
            isSelf: user.id === session.user.id,
            isOwner: isOwnerEmail(user.email),
          },
        ];
      }),
    );

    return { success: true as const, data };
  } catch (error) {
    console.error("Failed to list users for role management:", error);
    return { success: false as const, error: "failed" as const };
  }
}

export async function updateAdminUserRoleAction(locale: Locale, userId: string, role: string) {
  const session = await requireRole(locale, ["ADMIN"]);
  if (!isUserRole(role)) {
    return { success: false as const, error: "invalid_role" as const };
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!target || !isUserRole(target.role)) {
      return { success: false as const, error: "not_found" as const };
    }
    if (target.id === session.user.id) {
      return { success: false as const, error: "self" as const };
    }
    if (isOwnerEmail(target.email) && role !== "ADMIN") {
      return { success: false as const, error: "owner" as const };
    }
    if (target.role === "ADMIN" && role !== "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return { success: false as const, error: "last_admin" as const };
      }
    }
    if (target.role === role) {
      return { success: true as const };
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { role: role as Role },
    });

    return { success: true as const };
  } catch (error) {
    console.error("Failed to update user role:", error);
    return { success: false as const, error: "failed" as const };
  }
}

async function deleteUserRecords(tx: Prisma.TransactionClient, userId: string, email: string) {
  await tx.grade.deleteMany({ where: { graderId: userId } });
  await tx.submission.deleteMany({ where: { studentId: userId } });
  await tx.lessonNote.deleteMany({ where: { teacherId: userId } });
  await tx.whiteboardAssignment.deleteMany({ where: { teacherId: userId } });
  await tx.problemSetItem.deleteMany({ where: { problem: { authorId: userId } } });
  await tx.problemSet.deleteMany({ where: { authorId: userId } });
  await tx.problem.deleteMany({ where: { authorId: userId } });
  await tx.problemFamily.updateMany({
    where: { parent: { authorId: userId } },
    data: { parentId: null },
  });
  await tx.problemFamily.deleteMany({ where: { authorId: userId } });
  await tx.course.deleteMany({ where: { teacherId: userId } });
  await tx.verificationToken.deleteMany({ where: { email } });
  await tx.user.delete({ where: { id: userId } });
}

export async function deleteAdminUserAction(locale: Locale, userId: string) {
  const session = await requireRole(locale, ["ADMIN"]);
  const id = userId.trim();
  if (!id) return { success: false as const, error: "not_found" as const };

  try {
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });
    if (!target || !isUserRole(target.role)) {
      return { success: false as const, error: "not_found" as const };
    }
    if (target.id === session.user.id) {
      return { success: false as const, error: "self" as const };
    }
    if (isOwnerEmail(target.email)) {
      return { success: false as const, error: "owner" as const };
    }
    if (target.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return { success: false as const, error: "last_admin" as const };
      }
    }

    await prisma.$transaction((tx) => deleteUserRecords(tx, target.id, target.email), { timeout: 20000 });
    return { success: true as const };
  } catch (error) {
    console.error("Failed to delete user:", error);
    return { success: false as const, error: "failed" as const };
  }
}
