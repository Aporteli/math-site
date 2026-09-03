import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import '../globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { SiteAiChatWidget } from '@/components/lms/teacher/problem-bank/components/SiteAiChatWidget';
import { isLocale, locales } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { getSession } from '@/lib/auth/session';
import { canUseAdminSlashPrompts } from '@/lib/math/problems/slash-prompts-access';

export const maxDuration = 300;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

type LocaleParams = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
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
  const showAiChat = session?.user?.role === 'TEACHER' || session?.user?.role === 'ADMIN';
  const slash = canUseAdminSlashPrompts(session?.user);

  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-paper text-ink">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="flex flex-1 flex-col">{children}</div>
          {showAiChat ? (
            <SiteAiChatWidget
              copy={dict.dashboard.teacher.problemBank}
              enableSlashPrompts={slash.enabled}
              slashPromptsUserId={slash.storageKey}
            />
          ) : null}
        </ThemeProvider>
      </body>
    </html>
  );
}
