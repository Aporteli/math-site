import { notFound, redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { isLocale, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getSession } from "@/lib/auth/session";
import { isLocalDashboardPreview } from "@/lib/auth/paths";
import { prisma } from "@/lib/prisma";

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
  if (!session?.user?.id) {
    if (!isLocalDashboardPreview()) redirect(localePath(locale, "/login"));
    return null;
  }

  // ვიღებთ მომხმარებლის რეალურ, უახლეს როლს პირდაპირ ბაზიდან (და არა ძველი JWT ქუქიდან)
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });

  const currentRole = dbUser?.role ?? session.user.role;

  // თუ ბაზაშიც არ არის STUDENT ან ADMIN, მხოლოდ მაშინ გადავიდეს მთავარზე
  if (currentRole !== "STUDENT" && currentRole !== "ADMIN") {
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
      userName={dbUser?.name ?? session.user.name ?? student.role}
      role="student"
      labels={student.nav}
    >
      {children}
    </DashboardShell>
  );
}