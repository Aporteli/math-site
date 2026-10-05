import { cache } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { localePath, type Locale } from "@/i18n/config";
import { authOptions } from "@/lib/auth/options";
import { findRequestUser } from "@/lib/auth/request-user";
import {
  dashboardHomeForRole,
  LOGIN_PATH,
} from "@/lib/auth/paths";
import type { UserRole } from "@/lib/auth/roles";

export const getSession = cache(() => getServerSession(authOptions));

export async function requireRole(locale: Locale, roles: UserRole[]) {
  const session = await getSession();

  const email = session?.user?.email?.trim().toLowerCase();
  if (!session?.user || !email) {
    redirect(localePath(locale, LOGIN_PATH));
  }
  let currentRole = session.user.role;
  try {
    const dbUser = await findRequestUser(session.user.id ?? "", email);
    if (dbUser) {
      currentRole = dbUser.role as UserRole;
      session.user.role = currentRole;
      session.user.id = dbUser.id;
      if (dbUser.name) session.user.name = dbUser.name;
    }
  } catch (error) {
    console.error("REQUIRE_ROLE_DB_FETCH_ERROR:", error);
  }
  if (!roles.includes(currentRole)) {
    redirect(localePath(locale, dashboardHomeForRole(currentRole)));
  }
  return session;
}