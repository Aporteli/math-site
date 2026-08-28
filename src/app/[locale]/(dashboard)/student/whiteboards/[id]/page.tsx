import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { StudentWhiteboardEditor } from "@/components/lms/student/StudentWhiteboardEditor";

type PageProps = { params: Promise<{ locale: Locale; id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale);
  return {
    title: `${dict.dashboard.student.pages.whiteboards.title} | MathLab`,
  };
}

export default async function StudentWhiteboardDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();

  const session = await requireRole(locale, ["STUDENT"]);
  const dict = getDictionary(locale);

  const assignment = await prisma.whiteboardAssignment.findUnique({
    where: { id },
    include: { course: { select: { title: true } } },
  });

  if (
    !assignment ||
    (assignment.studentId !== session.user.id && session.user.role !== "ADMIN")
  ) {
    notFound();
  }

  const content =
    (assignment.content as { elements?: unknown[] } | null) ?? {};
  const elements = Array.isArray(content.elements) ? content.elements : [];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <StudentWhiteboardEditor
        id={assignment.id}
        locale={locale}
        title={assignment.title}
        initialElements={elements}
        copy={dict.dashboard.student.whiteboards}
      />
    </div>
  );
}
