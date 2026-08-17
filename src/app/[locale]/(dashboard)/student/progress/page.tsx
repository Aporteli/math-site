import type { Metadata } from "next";
import {
  StudentWorkspacePage,
  studentPageMetadata,
} from "@/components/lms/dashboard-page";

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return studentPageMetadata("progress", params);
}

export default function StudentProgressPage({ params }: PageProps) {
  return <StudentWorkspacePage id="progress" params={params} />;
}
