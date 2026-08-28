import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, PenTool } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { isLocale, localePath, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { PageHero } from "@/components/ui/page-hero";

type PageProps = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale);
  return {
    title: `${dict.dashboard.student.pages.whiteboards.title} | MathLab`,
  };
}

export default async function StudentWhiteboardsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const session = await requireRole(locale, ["STUDENT"]);
  const dict = getDictionary(locale);
  const copy = dict.dashboard.student.whiteboards;
  const pageCopy = dict.dashboard.student.pages.whiteboards;

  const items = await prisma.whiteboardAssignment.findMany({
    where: { studentId: session.user.id },
    include: {
      course: { select: { title: true } },
      teacher: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const statusLabels: Record<string, string> = {
    ASSIGNED: copy.statusAssigned,
    IN_PROGRESS: copy.statusInProgress,
    COMPLETED: copy.statusCompleted,
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 lg:space-y-8">
      <PageHero
        icon={PenTool}
        eyebrow={dict.dashboard.student.role}
        title={pageCopy.title}
        description={pageCopy.subtitle}
        aside={
          <div className="rounded-2xl border border-hairline bg-white/80 px-6 py-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
              {copy.total}
            </p>
            <p className="mt-1.5 text-3xl font-black text-navy">{items.length}</p>
          </div>
        }
      />

      {items.length === 0 ? (
        <div className="rounded-3xl border border-hairline bg-white p-10 text-center shadow-sm">
          <PenTool className="mx-auto size-10 text-muted" />
          <h2 className="mt-3 text-lg font-bold text-ink">{copy.emptyTitle}</h2>
          <p className="mt-1 text-sm text-muted">{copy.emptyHint}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((item) => {
            const statusLabel =
              statusLabels[item.status] ?? copy.statusAssigned;

            return (
              <Link
                key={item.id}
                href={localePath(locale, `/student/whiteboards/${item.id}`)}
                className="group flex items-center gap-4 rounded-2xl border border-hairline bg-white p-4 shadow-sm transition-all hover:border-navy/30 hover:shadow-md"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy-tint text-navy">
                  <PenTool className="size-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {copy.course}: {item.course?.title ?? copy.courseFallback} ·{" "}
                    {copy.teacher}: {item.teacher?.name ?? copy.teacherFallback}
                  </span>
                  <span className="mt-1.5 inline-flex rounded-full border border-hairline bg-paper px-2 py-0.5 text-[11px] font-semibold text-navy">
                    {statusLabel}
                  </span>
                </span>

                <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-navy" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
