import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { localePath, type Locale } from "@/i18n/config";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import {
  dashboardHomeForRole,
  LOGIN_PATH,
} from "@/lib/auth/paths";
import type { UserRole } from "@/lib/auth/roles";

export function getSession() {
  return getServerSession(authOptions);
}

export async function requireRole(locale: Locale, roles: UserRole[]) {
  const session = await getSession();

  const email = session?.user?.email?.trim().toLowerCase();
  if (!session?.user || !email) {
    redirect(localePath(locale, LOGIN_PATH));
  }

  // Always resolve the authoritative role from the database. The encrypted JWT
  // cookie can be stale (e.g. right after a VISITOR joins a class), and the proxy
  // reads that stale value before any server guard runs. Server-side checks must
  // therefore never rely on session.user.role alone.
  let currentRole = session.user.role;

  try {
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(session.user.id ? [{ id: session.user.id }] : []),
          { email },
        ],
      },
      select: { id: true, role: true, name: true },
    });

    if (dbUser) {
      currentRole = dbUser.role as UserRole;
      session.user.role = currentRole;
      session.user.id = dbUser.id;
      if (dbUser.name) session.user.name = dbUser.name;
    }
  } catch (error) {
    console.error("REQUIRE_ROLE_DB_FETCH_ERROR:", error);
  }

  // Redirect unauthorized roles to their own dashboard. This applies in every
  // environment (including local development) so STUDENT/VISITOR users cannot
  // browse teacher-only routes.
  if (!roles.includes(currentRole)) {
    redirect(localePath(locale, dashboardHomeForRole(currentRole)));
  }

  return session;
}