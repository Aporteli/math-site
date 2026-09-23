'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Compass, Search } from 'lucide-react';
import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';
import { PageHero } from '@/components/ui/PageHero';
import { extraCatalogTools, LOOKUP_ROWS, WORKSPACE_MODULES, type WorkspaceModule } from '@/lib/workspace';

type HomeCopy = Dictionary['home'];
type ToolsItems = Dictionary['toolsPage']['items'];

interface WorkspaceHubProps {
  locale: Locale;
  copy: HomeCopy;
  tools: ToolsItems;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function moduleText(module: WorkspaceModule, copy: HomeCopy) {
  const item = copy.modules.items[module.id];
  const links = module.links.map((link) => item.links[link.id as keyof typeof item.links]).join(' ');
  return `${item.title} ${links}`;
}

export function WorkspaceHub({ locale, copy, tools }: WorkspaceHubProps) {
  const [query, setQuery] = useState('');
  const q = normalize(query);

  const modules = WORKSPACE_MODULES.map((module) => {
    const item = copy.modules.items[module.id];
    const titleHit = !q || normalize(item.title).includes(q);
    const links = module.links.filter((link) => {
      if (titleHit) return true;
      const label = item.links[link.id as keyof typeof item.links];
      return normalize(label).includes(q);
    });
    return { module, item, links };
  }).filter(({ module, links }) => {
    if (!q) return true;
    return links.length > 0 || normalize(moduleText(module, copy)).includes(q);
  });

  const lookup = LOOKUP_ROWS.filter((row) => {
    if (!q) return true;
    return normalize(`${copy.lookup.rows[row.id]} ${copy.lookup.kinds[row.kind]}`).includes(q);
  });

  const extras = q
    ? extraCatalogTools().filter((tool) =>
        normalize(`${tools[tool.id].title} ${tools[tool.id].description} ${tools[tool.id].badge}`).includes(q),
      )
    : [];

  const isEmpty = modules.length === 0 && lookup.length === 0 && extras.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHero
        icon={Compass}
        title={copy.index.title}
        badge={copy.index.badge}
        aside={
          <label className="relative block">
            <span className="sr-only">{copy.index.searchLabel}</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.index.searchPlaceholder}
              autoComplete="off"
              className="w-full min-w-0 appearance-none rounded-2xl border border-hairline bg-white py-3 pr-4 pl-12 text-base text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:ring-2 focus:ring-navy/15 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
            />
          </label>
        }
      />

      {isEmpty ? (
        <div className="mt-8 rounded-2xl border border-dashed border-hairline bg-surface px-5 py-14 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-paper-deep text-muted">
            <Search className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-4 font-medium text-body">{copy.index.empty}</p>
        </div>
      ) : (
        <>
          {modules.length > 0 && (
            <section aria-labelledby="modules-title" className="mt-10">
              <div className="mb-4 flex items-center gap-4">
                <h2 id="modules-title" className="text-lg font-bold tracking-tight text-ink sm:text-xl">
                  {copy.modules.title}
                </h2>
                <div className="h-px flex-1 bg-hairline" aria-hidden="true" />
              </div>
              <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {modules.map(({ module, item, links }) => {
                  const Icon = module.icon;
                  return (
                    <li
                      key={module.id}
                      className="group rounded-2xl border border-hairline bg-surface p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-md sm:p-6">
                      <Link
                        href={localePath(locale, module.href)}
                        className="flex items-center gap-4 rounded-lg text-ink outline-none focus-visible:ring-3 focus-visible:ring-navy/20">
                        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy-tint text-navy transition-colors group-hover:bg-navy group-hover:text-white">
                          <Icon className="size-5.5" aria-hidden="true" />
                        </span>
                        <h3 className="min-w-0 flex-1 text-base font-bold leading-snug sm:text-lg">{item.title}</h3>
                        <ArrowUpRight
                          className="size-4.5 shrink-0 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-navy"
                          aria-hidden="true"
                        />
                      </Link>
                      <ul className="mt-5 grid gap-1 border-t border-hairline pt-3">
                        {links.map((link) => (
                          <li key={link.id}>
                            <Link
                              href={localePath(locale, link.href)}
                              className="flex items-start gap-3 rounded-lg px-2 py-2 text-sm leading-relaxed text-body transition-colors hover:bg-paper-deep hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/20">
                              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-navy/55" aria-hidden="true" />
                              <span className="min-w-0 flex-1 break-words">
                                {item.links[link.id as keyof typeof item.links]}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {(lookup.length > 0 || extras.length > 0) && (
            <section aria-labelledby="lookup-title" className="mt-10">
              <div className="mb-4 flex items-center gap-4">
                <h2 id="lookup-title" className="text-lg font-bold tracking-tight text-ink sm:text-xl">
                  {copy.lookup.title}
                </h2>
                <div className="h-px flex-1 bg-hairline" aria-hidden="true" />
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lookup.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={localePath(locale, row.href)}
                      className="group flex h-full items-center gap-3 rounded-xl border border-hairline bg-surface p-4 shadow-sm transition hover:border-navy/30 hover:bg-surface-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-navy/20">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold leading-snug text-ink">{copy.lookup.rows[row.id]}</span>
                        <span className="mt-1 block text-xs font-medium text-muted">{copy.lookup.kinds[row.kind]}</span>
                      </span>
                      <ArrowUpRight
                        className="size-4 shrink-0 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-navy"
                        aria-hidden="true"
                      />
                      <span className="sr-only">{copy.lookup.launch}</span>
                    </Link>
                  </li>
                ))}
                {extras.map((tool) => (
                  <li key={tool.id}>
                    <Link
                      href={localePath(locale, tool.href)}
                      className="group flex h-full items-center gap-3 rounded-xl border border-hairline bg-surface p-4 shadow-sm transition hover:border-navy/30 hover:bg-surface-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-navy/20">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold leading-snug text-ink">{tools[tool.id].title}</span>
                        <span className="mt-1 block text-xs font-medium text-muted">{tools[tool.id].badge}</span>
                      </span>
                      <ArrowUpRight
                        className="size-4 shrink-0 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-navy"
                        aria-hidden="true"
                      />
                      <span className="sr-only">{copy.lookup.launch}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
