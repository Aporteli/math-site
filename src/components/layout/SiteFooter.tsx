import Link from 'next/link';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { SiteLogo } from '@/components/layout/SiteLogo';
import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';
import { legalLinks, mainNavLinks, telegramHref } from '@/lib/navigation';

export function SiteFooter({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const { contact } = dict.footer;
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full border-t border-hairline bg-surface text-body">
      <div className="h-0.5 bg-brass" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 py-12 md:grid-cols-[minmax(0,1fr)_12rem] md:items-start md:gap-20 lg:py-14">
          <div className="max-w-lg">
            <SiteLogo locale={locale} brand={dict.brand} />
            <p className="mt-4 text-sm leading-6 text-muted">{dict.brand.person}</p>

            <address className="mt-8 not-italic">

              <ul className="mt-4 flex flex-col gap-2.5 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">

                <li>
                  <a
                    href={`mailto:${contact.email}`}
                    className="inline-flex items-center gap-2.5 transition-colors hover:text-navy">
                    <Mail className="size-4 shrink-0 text-brass" aria-hidden="true" />
                    <span>{contact.email}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={telegramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 transition-colors hover:text-navy">
                    <Send className="size-4 shrink-0 text-brass" aria-hidden="true" />
                    <span>{contact.telegram}</span>
                  </a>
                </li>
              </ul>
            </address>
          </div>

          <nav aria-label={dict.header.mainNav}>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">{dict.header.mainNav}</p>
            <ul className="mt-4 flex flex-col gap-1">
              {mainNavLinks.map((link) => (
                <li key={link.id}>
                  <Link
                    href={localePath(locale, link.href)}
                    className="inline-flex border-l-2 border-transparent py-1 pl-3 text-sm font-medium text-ink transition-colors hover:border-brass hover:text-navy">
                    {dict.nav[link.id]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-hairline py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{dict.footer.copyright.replace('{year}', String(currentYear))}</p>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {legalLinks.map((link) => (
              <li key={link.id}>
                <Link href={localePath(locale, link.href)} className="transition-colors hover:text-navy">
                  {dict.footer.legal[link.id]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
