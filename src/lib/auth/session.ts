import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { localePath, type Locale } from "@/i18n/config";
import { authOptions } from "@/lib/auth/options";
import { dashboardHomeForRole, LOGIN_PATH } from "@/lib/auth/paths";
import type { UserRole } from "@/lib/auth/roles";

export function getSession() {
  return getServerSession(authOptions);
}

export async function requireRole(locale: Locale, roles: UserRole[]) {
  const session = await getSession();

  if (!session?.user) {
    redirect(localePath(locale, LOGIN_PATH));
  }

  if (!roles.includes(session.user.role)) {
    redirect(localePath(locale, dashboardHomeForRole(session.user.role)));
  }

  return session;
}
