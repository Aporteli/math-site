import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

type LoginPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: LoginPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const { auth } = getDictionary(locale);

  return {
    title: auth.login.metaTitle,
    description: auth.login.metaDescription,
  };
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { auth } = getDictionary(locale);
  const copy = auth.login;

  return (
    <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-hairline bg-white shadow-sm">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-hairline-soft)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-hairline-soft)_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-70"
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 top-0 h-1 bg-brass-soft" aria-hidden="true" />
      <div className="relative p-6 sm:p-8">
        <p className="text-sm font-semibold tracking-wide text-brass">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-body">{copy.subtitle}</p>
        <div className="mt-6">
          <Suspense
            fallback={
              <div className="h-48 rounded-xl bg-paper-deep" aria-hidden="true" />
            }
          >
            <LoginForm locale={locale} copy={copy} />
          </Suspense>
        </div>
        <div className="mt-6 rounded-xl bg-paper-deep px-4 py-3 text-sm text-body">
          <p className="font-semibold text-ink">{copy.demoTitle}</p>
          <p className="mt-1">{copy.demoTeacher}</p>
          <p>{copy.demoStudent}</p>
          <p className="mt-1 text-muted">{copy.demoPassword}</p>
        </div>
      </div>
    </section>
  );
}
