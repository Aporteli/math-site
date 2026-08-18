import type { Metadata } from "next";
import {
  TeacherWorkspacePage,
  teacherPageMetadata,
} from "@/components/lms/dashboard-page";

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return teacherPageMetadata("problems", params);
}

export default function TeacherProblemsPage({ params }: PageProps) {
  return <TeacherWorkspacePage id="problems" params={params} />;
}
