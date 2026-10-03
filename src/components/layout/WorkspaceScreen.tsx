import type { ReactNode } from 'react';
import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { localePath, type Locale } from '@/i18n/config';
import type { DashboardLink } from '@/lib/dashboard';
import { PageHero } from '@/components/ui/PageHero';

interface WorkspaceScreenProps<Id extends string> {
  locale: Locale;
  title: string;
  subtitle: string;
  links: DashboardLink<Id>[];
  labels: Record<Id, string>;
  children?: ReactNode;
}

export function WorkspaceScreen<Id extends string>({
  locale,
  title,
  subtitle,
  links,
  labels,
  children,
}: WorkspaceScreenProps<Id>) {
  return (
    <div className={children ? 'h-full w-full' : 'mx-auto w-full space-y-6'}>
      {/* <PageHero icon={LayoutDashboard} title={title} description={subtitle} /> */}

      {children ? (
        <div className="h-full w-full">{children}</div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {links.map((link) => {
            const Icon = link.icon;

            return (
              <li key={link.id}>
                <Link
                  href={localePath(locale, link.href)}
                  className="flex h-full cursor-pointer gap-3 rounded-box border border-hairline bg-main p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-md">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-box bg-brass-tint text-brass-strong">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 text-sm font-bold text-ink">{labels[link.id]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
