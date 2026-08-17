import { notFound, redirect } from "next/navigation";
import { isLocale, localePath } from "@/i18n/config";
import { TEACHER_HOME } from "@/lib/auth/paths";

export default async function TeacherIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(localePath(locale, TEACHER_HOME));
}
