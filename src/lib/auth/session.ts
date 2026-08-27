import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { localePath, type Locale } from "@/i18n/config";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import {
  dashboardHomeForRole,
  isLocalDashboardPreview,
  LOGIN_PATH,
} from "@/lib/auth/paths";
import type { UserRole } from "@/lib/auth/roles";

export function getSession() {
  return getServerSession(authOptions);
}

export async function requireRole(locale: Locale, roles: UserRole[]) {
  const session = await getSession();

  if (!session?.user?.email) {
    redirect(localePath(locale, LOGIN_PATH));
  }

  let currentRole = session.user.role;

  // თუ სესიის ძველი როლი არ ემთხვევა, ვამოწმებთ რეალურ, უახლეს როლს ბაზაში
  if (!roles.includes(currentRole)) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email.trim().toLowerCase() },
        select: { id: true, role: true, name: true },
      });

      if (dbUser) {
        currentRole = dbUser.role as UserRole;
        session.user.role = currentRole;
        session.user.id = dbUser.id;
      }
    } catch (error) {
      console.error("REQUIRE_ROLE_DB_FETCH_ERROR:", error);
    }
  }

  // თუ ბაზაშიც არ აღმოჩნდა საჭირო როლი, მხოლოდ მაშინ გადავიდეს მთავარზე
  if (!isLocalDashboardPreview() && !roles.includes(currentRole)) {
    redirect(localePath(locale, dashboardHomeForRole(currentRole)));
  }

  return session;
}