import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";

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

  const session = await requireRole(locale, ["STUDENT"]);
  const dict = getDictionary(locale);
  const student = dict.dashboard.student;

  return (
    <DashboardShell
      locale={locale}
      dict={dict}
      roleLabel={student.role}
      userName={session.user.name ?? session.user.email ?? student.role}
      role="student"
      labels={student.nav}
    >
      {children}
    </DashboardShell>
  );
}
