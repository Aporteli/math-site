import type { Metadata } from "next";
import { TeacherWorkspacePage, teacherPageMetadata } from "@/components/layout/DashboardPage";

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return teacherPageMetadata("whiteboard", params);
}

export default function TeacherWhiteboardPage({ params }: PageProps) {
  return <TeacherWorkspacePage id="whiteboard" params={params} />;
}
