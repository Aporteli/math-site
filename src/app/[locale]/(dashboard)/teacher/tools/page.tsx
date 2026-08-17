import type { Metadata } from "next";
import {
  TeacherWorkspacePage,
  teacherPageMetadata,
} from "@/components/lms/dashboard-page";

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return teacherPageMetadata("tools", params);
}

export default function TeacherToolsPage({ params }: PageProps) {
  return <TeacherWorkspacePage id="tools" params={params} />;
}
