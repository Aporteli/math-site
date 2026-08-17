import { notFound, redirect } from "next/navigation";
import { isLocale, localePath } from "@/i18n/config";
import { STUDENT_HOME } from "@/lib/auth/paths";

export default async function StudentIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(localePath(locale, STUDENT_HOME));
}
