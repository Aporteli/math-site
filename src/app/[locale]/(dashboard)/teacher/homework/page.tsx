import type { Metadata } from "next";
import {
  TeacherWorkspacePage,
  teacherPageMetadata,
} from "@/components/lms/dashboard-page";

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return teacherPageMetadata("homework", params);
}

export default function TeacherHomeworkPage({ params }: PageProps) {
  return <TeacherWorkspacePage id="homework" params={params} />;
}
