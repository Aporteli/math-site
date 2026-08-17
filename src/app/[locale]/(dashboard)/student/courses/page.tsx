import type { Metadata } from "next";
import {
  StudentWorkspacePage,
  studentPageMetadata,
} from "@/components/lms/dashboard-page";

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return studentPageMetadata("courses", params);
}

export default function StudentCoursesPage({ params }: PageProps) {
  return <StudentWorkspacePage id="courses" params={params} />;
}
