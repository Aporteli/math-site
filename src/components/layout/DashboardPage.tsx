import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkspaceScreen } from "@/components/layout/WorkspaceScreen";
import { TeacherJournalWorkspace } from "@/components/lms/teacher/journal/TeacherJournalWorkspace";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import {
  STUDENT_NAV,
  TEACHER_NAV,
  type StudentPageId,
  type TeacherPageId,
} from "@/lib/dashboard";

type Params = Promise<{ locale: string }>;

export async function teacherPageMetadata(
  id: TeacherPageId,
  params: Params,
): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const page = getDictionary(locale).dashboard.teacher.pages[id];
  return { title: page.title, description: page.subtitle };
}

export async function studentPageMetadata(
  id: StudentPageId,
  params: Params,
): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const page = getDictionary(locale).dashboard.student.pages[id];
  return { title: page.title, description: page.subtitle };
}

export async function TeacherWorkspacePage({
  id,
  params,
}: {
  id: TeacherPageId;
  params: Params;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const teacher = getDictionary(locale).dashboard.teacher;
  const page = teacher.pages[id];

  const renderContent = () => {
    switch (id as string) {
      case "journal":
      case "calendar":
        return <TeacherJournalWorkspace />;
      default:
        return null;
    }
  };

  return (
    <WorkspaceScreen
      locale={locale}
      title={page.title}
      subtitle={page.subtitle}
      links={TEACHER_NAV}
      labels={teacher.nav}
    >
      {renderContent()}
    </WorkspaceScreen>
  );
}

export async function StudentWorkspacePage({
  id,
  params,
}: {
  id: StudentPageId;
  params: Params;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const student = getDictionary(locale).dashboard.student;
  const page = student.pages[id];

  return (
    <WorkspaceScreen
      locale={locale}
      title={page.title}
      subtitle={page.subtitle}
      links={STUDENT_NAV}
      labels={student.nav}
    />
  );
}