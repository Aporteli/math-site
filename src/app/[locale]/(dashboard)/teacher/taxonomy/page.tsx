import { redirect } from "next/navigation";
import { isLocale, localePath } from "@/i18n/config";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

/** Curriculum manager moved into Admin panel. */
export default async function TeacherTaxonomyRedirectPage({
  params,
}: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(localePath(locale, "/teacher/admin"));
}
