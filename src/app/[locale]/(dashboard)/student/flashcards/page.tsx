import type { Metadata } from "next";
import {
  StudentWorkspacePage,
  studentPageMetadata,
} from "@/components/lms/dashboard-page";

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return studentPageMetadata("flashcards", params);
}

export default function StudentFlashcardsPage({ params }: PageProps) {
  return <StudentWorkspacePage id="flashcards" params={params} />;
}
