import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { SiteLogo } from '@/components/layout/SiteLogo';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { notFound } from 'next/navigation';

export default async function AuthLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-hairline bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between gap-3 px-4 sm:px-6">
          <SiteLogo locale={locale} brand={dict.brand} />
          <LanguageSwitcher locale={locale} label={dict.header.language} />
          <ThemeToggle label={dict.header.theme} />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
