import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { ClipboardCheck } from "lucide-react";
import { TeacherHomeworkWorkspace } from "@/components/lms/teacher/TeacherHomeworkWorkspace";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "საშინაო დავალებების შემოწმება | MathLab",
    description: "სტუდენტების მიერ გამოგზავნილი ამოცანების შემოწმება და შეფასება",
  };
}

export default async function TeacherHomeworkPage({ params }: PageProps) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHero
        icon={ClipboardCheck}
        eyebrow="სასწავლო მართვა"
        title="საშინაო დავალებების შემოწმება"
        description="შეამოწმეთ სტუდენტების მიერ გამოგზავნილი ამოცანები, დაფაზე ნაწერი ამოხსნები, ატვირთული ფაილები და დაუწერეთ შეფასება."
      />

      <TeacherHomeworkWorkspace />
    </div>
  );
}