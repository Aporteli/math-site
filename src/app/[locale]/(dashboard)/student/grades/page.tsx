import type { Metadata } from "next";
import {
  StudentWorkspacePage,
  studentPageMetadata,
} from "@/components/lms/dashboard-page";

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return studentPageMetadata("grades", params);
}

export default function StudentGradesPage({ params }: PageProps) {
  return <StudentWorkspacePage id="grades" params={params} />;
}
