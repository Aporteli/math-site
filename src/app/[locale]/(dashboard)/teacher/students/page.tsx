import type { Metadata } from "next";
import {
  TeacherWorkspacePage,
  teacherPageMetadata,
} from "@/components/lms/dashboard-page";

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return teacherPageMetadata("students", params);
}

export default function TeacherStudentsPage({ params }: PageProps) {
  return <TeacherWorkspacePage id="students" params={params} />;
}
