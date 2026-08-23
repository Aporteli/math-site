import { notFound } from "next/navigation";
import { WorkspaceDock } from "@/components/auth/workspace-dock";
import { JoinClassModal } from "@/components/auth/join-class-modal";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getSession } from "@/lib/auth/session";

export default async function PublicLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  const session = await getSession();
  const user = session?.user ? { role: session.user.role } : null;

  // სამუშაო სივრცის მენიუ (Dock) გამოუჩნდეს მხოლოდ სტუდენტს, მასწავლებელს ან ადმინს
  const hasWorkspaceAccess =
    user?.role === "STUDENT" ||
    user?.role === "TEACHER" ||
    user?.role === "ADMIN";

  const roleLabel =
    user?.role === "STUDENT"
      ? dict.dashboard.student.role
      : dict.dashboard.teacher.role;

  // თუ მომხმარებელი შესულია, მაგრამ აქვს VISITOR როლი, გამოვუჩინოთ კლასის კოდის მოდალი
  const showJoinModal = user?.role === "VISITOR";

  return (
    <div
      className={`flex min-h-screen flex-col bg-paper pb-[calc(4.25rem+env(safe-area-inset-bottom))] ${
        hasWorkspaceAccess ? "min-[500px]:pb-24" : "min-[500px]:pb-0"
      }`}
    >
      {showJoinModal ? <JoinClassModal locale={locale} /> : null}

      <SiteHeader locale={locale} dict={dict} session={user} />
      <main className="flex-1">{children}</main>

      {hasWorkspaceAccess && user ? (
        <WorkspaceDock
          locale={locale}
          role={user.role}
          roleLabel={roleLabel}
          label={dict.dashboard.workspace}
          hint={dict.dashboard.openWorkspace}
        />
      ) : null}

      <SiteFooter locale={locale} dict={dict} />
    </div>
  );
}