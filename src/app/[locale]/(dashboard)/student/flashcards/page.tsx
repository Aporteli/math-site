import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import type { Locale } from "@/i18n/config";
import { PageHero } from "@/components/ui/page-hero";
import { BrainCircuit } from "lucide-react";
import { StudentFlashcardsWorkspace } from "@/components/lms/StudentFlashcardsWorkspace";

type PageProps = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: "ჩემი დავალებები | MathLab",
    description: "მასწავლებლის მიერ გამოგზავნილი სასწავლო ბარათები და ამოცანები",
  };
}

export default async function StudentFlashcardsPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await requireRole(locale, ["STUDENT"]);

  // 1. ვპოულობთ კურსებს, რომელშიც მოსწავლეა ჩარიცხული
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: session.user.id,
      status: "ACTIVE",
    },
    include: {
      course: { select: { title: true } }
    }
  });

  const enrolledCourseIds = enrollments.map((e) => e.courseId);

  // 2. ვიღებთ დავალებებს, რომლებიც პირადად ამ სტუდენტს ან მთელ კურსს გამოეგზავნა
  const rawAssignments = await prisma.assignment.findMany({
    where: {
      courseId: { in: enrolledCourseIds },
      OR: [
        { targetUserId: session.user.id },
        { targetUserId: null },
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
    customPayload: a.customPayload || {},
    createdAt: a.createdAt.toISOString(),
    course: { title: a.course.title },
    comments: a.comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      author: c.author,
    })),
  }));

  // სტატისტიკის დათვლა UI-სთვის
  const flashcardsCount = assignments.filter(a => a.type === "FLASHCARD").length;
  const problemsCount = assignments.filter(a => a.type === "PROBLEM").length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 lg:space-y-8 relative">
      {/* მსუბუქი დეკორატიული ფონი (Glow) პრემიუმ იერსახისთვის */}
      <div className="absolute top-0 right-0 -z-10 h-[400px] w-[600px] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-navy-tint/40 via-transparent to-transparent opacity-50 blur-3xl pointer-events-none" />

      <PageHero
        icon={BrainCircuit}
        eyebrow="ჩემი სასწავლო სივრცე"
        title="ბარათები და ამოცანები"
        description="აქ ინახება მასწავლებლის მიერ გამოგზავნილი პერსონალური დავალებები. გაეცანით პირობებს და თუ რამე გაუგებარია, იქვე დასვით კითხვები."
        aside={
          <div className="grid grid-cols-2 gap-3">
            {/* მთავარი ბარათი - იკავებს ორივე სვეტს (col-span-2) */}
            <div className="col-span-2 rounded-2xl border border-hairline bg-white/80 px-5 py-4 shadow-sm backdrop-blur-md transition-colors hover:border-navy/30">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                სულ დავალება
              </p>
              <p className="mt-1.5 text-3xl font-black text-ink">
                {assignments.length}
              </p>
            </div>
            
            {/* ქვე-ბარათი 1 */}
            <div className="rounded-2xl border border-hairline bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md transition-colors hover:border-navy/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                ბარათები
              </p>
              <p className="mt-1 text-xl font-black text-navy">
                {flashcardsCount}
              </p>
            </div>
            
            {/* ქვე-ბარათი 2 */}
            <div className="rounded-2xl border border-hairline bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md transition-colors hover:border-navy/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                ამოცანები
              </p>
              <p className="mt-1 text-xl font-black text-amber-600">
                {problemsCount}
              </p>
            </div>
          </div>
        }
      />

      <div className="pt-2">
        <StudentFlashcardsWorkspace
          initialAssignments={assignments}
          studentName={session.user.name || "მოსწავლე"}
        />
      </div>
    </div>
  );
}