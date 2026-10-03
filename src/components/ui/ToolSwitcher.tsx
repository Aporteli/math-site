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
        className="relative overflow-hidden rounded-box border border-hairline bg-main p-2 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass">
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
          {/* Back */}
          <Link
            href={localePath(locale, '/tools')}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-box px-3 py-2 text-xs font-bold text-mainText transition-colors hover:bg-sectionHeader">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span className="whitespace-nowrap">{copy.tool.back}</span>
          </Link>

          <div className="mx-1 h-5 w-px shrink-0 bg-hairline" aria-hidden="true" />

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
                  'inline-flex shrink-0 items-center gap-1.5 rounded-box px-3 py-2 text-xs transition-all duration-200 ' +
                  (active
                    ? 'bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                    : 'font-medium text-mainText hover:bg-sectionHeader')
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