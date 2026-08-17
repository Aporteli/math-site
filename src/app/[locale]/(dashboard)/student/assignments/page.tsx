import type { Metadata } from "next";
import {
  StudentWorkspacePage,
  studentPageMetadata,
} from "@/components/lms/dashboard-page";

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return studentPageMetadata("assignments", params);
}

export default function StudentAssignmentsPage({ params }: PageProps) {
  return <StudentWorkspacePage id="assignments" params={params} />;
}
