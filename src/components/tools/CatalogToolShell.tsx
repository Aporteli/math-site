import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHero } from '@/components/ui/PageHero';
import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';
import { badgeToneClass, type CatalogTool } from '@/lib/tools';

interface CatalogToolShellProps {
  locale: Locale;
  tool: CatalogTool;
  item: Dictionary['toolsPage']['items'][CatalogTool['id']];
  sectionTitle: string;
  copy: Dictionary['toolsPage']['tool'];
}

export function CatalogToolShell({ locale, tool, item, sectionTitle, copy }: CatalogToolShellProps) {
  const Icon = tool.icon;
  const tone = badgeToneClass[tool.badgeColor];

  return (
    <div className="overflow-x-clip">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href={localePath(locale, '/tools')}
          className="inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-navy-strong">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {copy.back}
        </Link>
        <div className="mt-5">
          <PageHero
            icon={Icon}
            eyebrow={sectionTitle}
            badge={item.badge}
            title={item.title}
            description={item.description}
          />
        </div>
        <section className="mt-8 rounded-3xl border border-hairline bg-white p-6 shadow-sm sm:p-8">
          <span className={`inline-flex size-12 items-center justify-center rounded-2xl ${tone.chip}`}>
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink">{copy.comingSoon}</h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-body">{copy.comingSoonText}</p>
        </section>
      </div>
    </div>
  );
}
