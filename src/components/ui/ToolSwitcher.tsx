'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';
import { TOOL_SECTIONS } from '@/lib/tools';

interface ToolSwitcherProps {
  locale: Locale;
  currentId: string;
  copy: Dictionary['toolsPage'];
  title: string;
  description: string;
}

export function ToolSwitcher({
  locale,
  currentId,
  copy,
  title,
  description,
}: ToolSwitcherProps) {
  const allTools = TOOL_SECTIONS.flatMap((section) => section.tools);

  return (
    <div className="space-y-4">
      {/* ── Horizontal nav strip ── */}
      <nav
        aria-label={copy.hero.eyebrow ?? 'Tools'}
        className="rounded-2xl border border-hairline bg-white p-2 shadow-sm dark:bg-slate-900/60 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
          {/* Back */}
          <Link
            href={localePath(locale, '/tools')}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-muted transition-colors hover:bg-paper hover:text-navy dark:hover:bg-slate-800">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span className="whitespace-nowrap">{copy.tool.back}</span>
          </Link>

          <div className="mx-1 h-5 w-px shrink-0 bg-hairline dark:bg-slate-700" aria-hidden="true" />

          {/* Calculator pills */}
          {allTools.map((tool) => {
            const Icon = tool.icon;
            const item = copy.items[tool.id];
            const active = tool.id === currentId;
            return (
              <Link
                key={tool.id}
                href={localePath(locale, tool.href)}
                title={item.title}
                aria-current={active ? 'page' : undefined}
                className={
                  'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ' +
                  (active
                    ? 'bg-navy text-white shadow-sm dark:bg-sky-600'
                    : 'text-body hover:bg-navy-tint hover:text-navy dark:hover:bg-slate-800 dark:hover:text-sky-400')
                }>
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{item.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Title + description ── */}
      <header className="px-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
            {description}
          </p>
        )}
      </header>
    </div>
  );
}