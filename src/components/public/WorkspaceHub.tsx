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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
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
        <p className="mt-10 rounded-xl border border-hairline bg-white px-5 py-10 text-center text-body">
          {copy.index.empty}
        </p>
      ) : (
        <>
          {modules.length > 0 && (
            <section aria-labelledby="modules-title" className="mt-10">
              <h2 id="modules-title" className="sr-only">
                {copy.modules.title}
              </h2>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {modules.map(({ module, item, links }) => {
                  const Icon = module.icon;
                  return (
                    <li key={module.id} className="rounded-xl border border-hairline bg-white p-5 shadow-sm">
                      <Link
                        href={localePath(locale, module.href)}
                        className="flex items-center gap-3 text-ink hover:text-navy">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy-tint text-navy">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <h3 className="min-w-0 text-base font-semibold leading-snug">{item.title}</h3>
                      </Link>
                      <ul className="mt-4 space-y-1.5 border-t border-hairline pt-3">
                        {links.map((link) => (
                          <li key={link.id}>
                            <Link
                              href={localePath(locale, link.href)}
                              className="flex items-start justify-between gap-3 rounded-lg px-1 py-1.5 text-sm text-body hover:bg-paper-deep hover:text-ink">
                              <span className="min-w-0 break-words">
                                {item.links[link.id as keyof typeof item.links]}
                              </span>
                              <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden="true" />
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
              <h2 id="lookup-title" className="text-sm font-semibold tracking-wide text-muted">
                {copy.lookup.title}
              </h2>
              <div className="mt-3 overflow-x-auto rounded-xl border border-hairline bg-white shadow-sm">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="border-b border-hairline bg-paper-deep text-xs font-semibold tracking-wide text-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        {copy.lookup.columns.name}
                      </th>
                      <th scope="col" className="px-4 py-3">
                        {copy.lookup.columns.kind}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        {copy.lookup.columns.action}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lookup.map((row) => (
                      <tr key={row.id} className="border-b border-hairline last:border-0">
                        <td className="px-4 py-3 font-medium text-ink">{copy.lookup.rows[row.id]}</td>
                        <td className="px-4 py-3 text-body">{copy.lookup.kinds[row.kind]}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={localePath(locale, row.href)}
                            className="inline-flex items-center justify-center rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-strong">
                            {copy.lookup.launch}
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {extras.map((tool) => (
                      <tr key={tool.id} className="border-b border-hairline last:border-0">
                        <td className="px-4 py-3 font-medium text-ink">{tools[tool.id].title}</td>
                        <td className="px-4 py-3 text-body">{tools[tool.id].badge}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={localePath(locale, tool.href)}
                            className="inline-flex items-center justify-center rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-strong">
                            {copy.lookup.launch}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
