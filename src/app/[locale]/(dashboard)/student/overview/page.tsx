import type { Metadata } from "next";
import {
  StudentWorkspacePage,
  studentPageMetadata,
} from "@/components/lms/dashboard-page";

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return studentPageMetadata("overview", params);
}

export default function StudentOverviewPage({ params }: PageProps) {
  return <StudentWorkspacePage id="overview" params={params} />;
}
