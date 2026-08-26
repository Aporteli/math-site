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

  // 1. უსაფრთხოდ ვიღებთ სესიას კრაშის გარეშე
  const session = await getSession();

  // თუ არაა დალოგინებული ან არ არის STUDENT / ADMIN, პირდაპირ ვუშვებთ მთავარზე
  if (!session || (session.user.role !== "STUDENT" && session.user.role !== "ADMIN")) {
    if (!isLocalDashboardPreview()) {
      redirect(localePath(locale, "/"));
    }
  }

  const userId = session?.user?.id;

  // 2. ვამოწმებთ კლასს უსაფრთხოდ (მხოლოდ თუ userId არსებობს)
  let enrollment = null;
  if (userId) {
    try {
      enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: userId,
          status: "ACTIVE",
        },
        include: {
          course: true,
        },
      });
    } catch (e) {
      console.error("ENROLLMENT_FETCH_ERROR:", e);
    }
  }

  // თუ სტუდენტი ჯერ არცერთ კლასში არ არის გაწევრიანებული, გადაგვყავს მთავარზე კოდის შესაყვანად
  if (!enrollment && !isLocalDashboardPreview() && session?.user?.role !== "ADMIN") {
    redirect(localePath(locale, "/?joinModal=true"));
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