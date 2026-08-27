import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { PageHero } from "@/components/ui/page-hero";
import { Sparkles } from "lucide-react";
import { StudentFlashcardsWorkspace } from "@/components/lms/StudentFlashcardsWorkspace";

type PageProps = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: "ფორმულები | MathLab",
    description: "მასწავლებლის მიერ გამოგზავნილი ფორმულები",
  };
}

export default async function StudentFlashcardsPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await requireRole(locale, ["STUDENT"]);
  const dict = getDictionary(locale);

  // 1. ვპოულობთ კურსებს, რომლებშიც მოსწავლეა ჩარიცხული
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: session.user.id,
      status: "ACTIVE",
    },
    select: { courseId: true },
  });

  const enrolledCourseIds = enrollments.map((e) => e.courseId);

  // 2. ვიღებთ მხოლოდ FLASHCARD ტიპის დავალებებს
  const rawAssignments = await prisma.assignment.findMany({
    where: {
      type: "FLASHCARD", // მხოლოდ ფლეშ ბარათები
      OR: [
        { targetUserId: session.user.id },
        {
          targetUserId: null,
          courseId: { in: enrolledCourseIds },
        },
      ],
    },
    include: {
      course: { select: { title: true } },
      comments: {
        include: {
          author: { select: { name: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const assignments = rawAssignments.map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type,
    instructions: a.instructions,
    customPayload: (a.customPayload as Record<string, unknown>) || {},
    createdAt: a.createdAt.toISOString(),
    course: { title: a.course?.title || "ზოგადი კურსი" },
    comments: a.comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      author: c.author,
    })),
  }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 lg:space-y-8 relative">
      <div className="absolute top-0 right-0 -z-10 h-[400px] w-[600px] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-navy-tint/40 via-transparent to-transparent opacity-50 blur-3xl pointer-events-none" />

      <PageHero
        icon={Sparkles}
        eyebrow="ჩემი სასწავლო სივრცე"
        title="ფორმულები"
        description="აქ ინახება მასწავლებლის მიერ გამოგზავნილი ფორმულები."
        aside={
          <div className="rounded-2xl border border-hairline bg-white/80 px-6 py-4 shadow-sm backdrop-blur-md transition-colors hover:border-navy/30 min-w-[160px]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
              სულ ფორმულა
            </p>
            <p className="mt-1.5 text-3xl font-black text-navy">
              {assignments.length}
            </p>
          </div>
        }
      />

      <div className="pt-2">
        <StudentFlashcardsWorkspace
          initialAssignments={assignments}
          studentName={session.user.name || dict.dashboard.student.role}
          copy={dict.dashboard.student.flashcards}
        />
      </div>
    </div>
  );
}