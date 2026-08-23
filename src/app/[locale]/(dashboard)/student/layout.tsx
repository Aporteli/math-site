import { notFound, redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { isLocale, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireRole } from "@/lib/auth/session";
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

  // 1. როლის დაცვა: უშვებს მხოლოდ ავტორიზებულ STUDENT-ს (VISITOR ავტომატურად გადამისამართდება მთავარზე)
  const session = await requireRole(locale, ["STUDENT"]);

  // 2. კლასის/სამუშაო სივრცის დაცვა: ვამოწმებთ, აქვს თუ არა სტუდენტს აქტიური კლასი
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: session.user.id,
      status: "ACTIVE",
    },
    include: {
      course: true,
    },
  });

  // თუ სტუდენტი ჯერ არცერთ კლასში არ არის გაწევრიანებული, გადაგვყავს კოდის შეყვანის / მთავარ გვერდზე
  if (!enrollment) {
    redirect(localePath(locale, "/?joinModal=true"));
  }

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