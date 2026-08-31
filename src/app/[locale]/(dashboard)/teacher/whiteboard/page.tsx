import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeacherWhiteboard } from "@/components/lms/teacher/TeacherWhiteboard";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const page = getDictionary(locale).dashboard.teacher.pages.whiteboard;
  return { title: page.title, description: page.subtitle };
}

export default async function TeacherWhiteboardPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);

  return <TeacherWhiteboard copy={dict.dashboard.teacher.whiteboard} />;
}
