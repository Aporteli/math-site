import type { Metadata } from "next";
import {
  TeacherWorkspacePage,
  teacherPageMetadata,
} from "@/components/lms/dashboard-page";

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return teacherPageMetadata("overview", params);
}

export default function TeacherOverviewPage({ params }: PageProps) {
  return <TeacherWorkspacePage id="overview" params={params} />;
}
