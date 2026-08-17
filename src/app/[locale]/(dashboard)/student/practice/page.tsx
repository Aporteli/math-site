import type { Metadata } from "next";
import {
  StudentWorkspacePage,
  studentPageMetadata,
} from "@/components/lms/dashboard-page";

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return studentPageMetadata("practice", params);
}

export default function StudentPracticePage({ params }: PageProps) {
  return <StudentWorkspacePage id="practice" params={params} />;
}
