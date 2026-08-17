import type { Metadata } from "next";
import {
  TeacherWorkspacePage,
  teacherPageMetadata,
} from "@/components/lms/dashboard-page";

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return teacherPageMetadata("reports", params);
}

export default function TeacherReportsPage({ params }: PageProps) {
  return <TeacherWorkspacePage id="reports" params={params} />;
}
