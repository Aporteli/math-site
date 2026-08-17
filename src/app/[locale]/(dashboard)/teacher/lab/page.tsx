import type { Metadata } from "next";
import {
  TeacherWorkspacePage,
  teacherPageMetadata,
} from "@/components/lms/dashboard-page";

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return teacherPageMetadata("lab", params);
}

export default function TeacherLabPage({ params }: PageProps) {
  return <TeacherWorkspacePage id="lab" params={params} />;
}
