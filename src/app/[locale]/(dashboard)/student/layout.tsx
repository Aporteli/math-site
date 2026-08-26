import { notFound, redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { isLocale, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getSession } from "@/lib/auth/session";
import { isLocalDashboardPreview } from "@/lib/auth/paths";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const session = await getSession();

  // VISITOR ან არაავტორიზებული მომხმარებელი აქ ვერ შევა — გადადის მთავარზე
  if (!session || (session.user.role !== "STUDENT" && session.user.role !== "ADMIN")) {
    if (!isLocalDashboardPreview()) {
      redirect(localePath(locale, "/"));
    }
  }

  const dict = getDictionary(locale);
  const student = dict.dashboard.student;

  return (
    <DashboardShell
      locale={locale}
      dict={dict}
      roleLabel={student.role}
      userName={session?.user?.name ?? session?.user?.email ?? student.role}
      role="student"
      labels={student.nav}
    >
      {children}
    </DashboardShell>
  );
}