import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { ThemeInit } from "@/components/layout/theme-init";
import "../globals.css";
import { SiteAiChatWidget } from "@/components/lms/problem-bank/site-ai-chat-widget";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getSession } from "@/lib/auth/session";
import { canUseAdminSlashPrompts } from "@/lib/math/problems/slash-prompts-access";

// Vercel serverless functions default to a ~10s duration limit, but the AI
// chat / problem-generation Server Actions can legitimately run up to ~75s
// (and up to ~150s when a fallback model is tried after a timeout). Raise the
// ceiling so the platform doesn't kill the request before our own
// AbortSignal.timeout() limits fire and return a clean error.
// NOTE: Vercel Hobby caps this at 10s — use a Pro plan (Fluid Compute) to honor 300s.
export const maxDuration = 300;

// Let content extend into the device safe areas (Android system navigation bar /
// gesture bar) so `env(safe-area-inset-*)` resolves to a real value instead of 0.
// Without this, fixed full-screen surfaces (classroom whiteboard, mobile nav) sit
// underneath the tablet navigation bar and their bottom toolbars get clipped.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

type LocaleParams = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const dict = getDictionary(locale);

  return {
    title: {
      default: dict.meta.title,
      template: `%s | ${dict.meta.title}`,
    },
    description: dict.meta.description,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleParams & Readonly<{ children: React.ReactNode }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await getSession();
  const dict = getDictionary(locale);
  const showAiChat =
    session?.user?.role === "TEACHER" || session?.user?.role === "ADMIN";
  const slash = canUseAdminSlashPrompts(session?.user);

  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-paper text-ink">
        <ThemeInit />
        <div className="flex flex-1 flex-col">
          {children}
        </div>
        {showAiChat ? (
          <SiteAiChatWidget
            copy={dict.dashboard.teacher.problemBank}
            enableSlashPrompts={slash.enabled}
            slashPromptsUserId={slash.storageKey}
          />
        ) : null}
      </body>
    </html>
  );
}