import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import type { Locale } from "@/i18n/config";
import { PageHero } from "@/components/ui/page-hero";
import { Users } from "lucide-react";
import { TeacherStudentsWorkspace } from "@/components/lms/TeacherStudentsWorkspace";

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: "მოსწავლეების მართვა | MathLab",
    description: "მოსწავლეების მონაცემები, ინდივიდუალური ბარათები და კომუნიკაცია",
  };
}

export default async function TeacherStudentsPage({ params }: PageProps) {
  const { locale } = await params;
  const session = await requireRole(locale, ["TEACHER", "ADMIN"]);

  const teacherCourses = await prisma.course.findMany({
    where: {
      teacherId: session.user.id,
    },
    include: {
      enrollments: {
        where: {
          user: {
            role: "STUDENT",
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
              submissions: {
                where: {
                  assignment: {
                    course: {
                      teacherId: session.user.id,
                    },
                  },
                },
                include: {
                  assignment: {
                    include: {
                      comments: {
                        include: {
                          author: { select: { name: true, role: true } },
                        },
                        orderBy: { createdAt: "asc" },
                      },
                    },
                  },
                },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const problemSets = await prisma.problemSet.findMany({
    where: { authorId: session.user.id },
    include: {
      items: {
        include: {
          problem: true,
        },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const setProblemsList = problemSets.flatMap((set) =>
    set.items.map((item) => ({
      id: item.problem.id,
      setId: set.id,
      setTitle: set.title,
      title: item.problem.topic || item.problem.kind || "ბარათი",
      promptTex: item.problem.promptTex || item.problem.formula || "",
      solutionTex: item.problem.solutionTex || "",
    }))
  );

  const availableSetProblems = setProblemsList.filter(
    (item, index, self) => index === self.findIndex((t) => t.id === item.id)
  );

  const studentsMap = new Map<string, any>();

  teacherCourses.forEach((course) => {
    course.enrollments.forEach((enrollment) => {
      const student = enrollment.user;
      if (!studentsMap.has(student.id)) {
        studentsMap.set(student.id, {
          id: student.id,
          name: student.name,
          email: student.email,
          imageUrl: student.imageUrl,
          courses: [{ id: course.id, title: course.title }],
          assignments: student.submissions.map((sub: any) => {
            const a = sub.assignment;
            const payload = (a.customPayload as Record<string, unknown>) || {};
            return {
              id: a.id,
              submissionId: sub.id,
              title: a.title,
              type: a.type,
              instructions: a.instructions,
              status: sub.status || a.status,
              createdAt: a.createdAt.toISOString(),
              promptTex: String(payload.promptTex || payload.text || a.instructions || ""),
              // მასწავლებლის მიერ გაგზავნილი სურათი ან დაფის კადრი
              problemImageUrl: a.attachmentUrl || (typeof payload.imageUrl === "string" ? payload.imageUrl : null),
              // მოსწავლის მიერ ატვირთული პასუხი
              studentAttachmentUrl: sub.attachmentUrl || null,
              comments: a.comments.map((c: any) => ({
                id: c.id,
                body: c.body,
                createdAt: c.createdAt.toISOString(),
                author: c.author,
              })),
            };
          }),
        });
      } else {
        studentsMap.get(student.id)?.courses.push({
          id: course.id,
          title: course.title,
        });
      }
    });
  });

  const studentsList = Array.from(studentsMap.values());
  const coursesSimple = teacherCourses.map((c) => ({
    id: c.id,
    title: c.title,
  }));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHero
        icon={Users}
        eyebrow="სასწავლო სივრცე"
        title="მოსწავლეების მართვა"
        description="აირჩიეთ მოსწავლე სიიდან, გაუგზავნეთ შენახული ბარათები/ამოცანები და გაუწიეთ უკუკავშირი."
        aside={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
            <div className="rounded-xl border border-hairline bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                სულ მოსწავლე
              </p>
              <p className="mt-1 text-2xl font-bold text-ink">
                {studentsList.length}
              </p>
            </div>
            <div className="rounded-xl border border-hairline bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                ხელმისაწვდომი ბარათები
              </p>
              <p className="mt-1 text-2xl font-bold text-ink">
                {availableSetProblems.length}
              </p>
            </div>
          </div>
        }
      />

      <TeacherStudentsWorkspace
        initialStudents={studentsList}
        courses={coursesSimple}
        availableSetProblems={availableSetProblems}
      />
    </div>
  );
}