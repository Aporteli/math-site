'use client';

import Link from 'next/link';
import { localePath, type Locale } from '@/i18n/config';
import type { ProblemBankCopy, ProblemBankTool } from '@/lib/math/problems';
import type { ProblemBankPanel } from '../problem-bank-workspace.types';

type ProblemBankToolGridProps = {
  copy: ProblemBankCopy;
  locale: Locale;
  visibleTools: ProblemBankTool[];
  panel: ProblemBankPanel;
  importOpen: boolean;
  notice: string | null;
  onTool: (id: ProblemBankTool['id']) => void;
  onDismissNotice: () => void;
};

export function ProblemBankToolGrid({
  copy,
  locale,
  visibleTools,
  panel,
  importOpen,
  notice,
  onTool,
  onDismissNotice,
}: ProblemBankToolGridProps) {
  if (visibleTools.length === 0) return null;

  return (
    <section className="mt-6" aria-label={copy.tools.label}>
      <p className="mb-3 text-sm font-semibold tracking-wide text-brass">{copy.tools.label}</p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {visibleTools.map((tool) => {
          const Icon = tool.icon;
          const item = copy.tools[tool.id];
          const className = [
            'flex h-full w-full flex-col gap-1 rounded-box border px-4 py-3 text-left transition-all',
            tool.status === 'ready' && (panel === tool.id || (tool.id === 'import' && importOpen))
              ? 'border-hairline bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
              : 'border-hairline bg-main shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-md',
          ].join(' ');

          const body = (
            <>
              <span className="flex items-center  gap-2">
                <span className="inline-flex size-8 shrink-0 items-center justify-center  text-brass-strong">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 text-sm font-semibold text-ink">{item.title}</span>
                {tool.status === 'soon' ? (
                  <span className="ml-auto shrink-0 rounded-box bg-brass-tint px-2 py-0.5 text-[10px] font-semibold tracking-wide text-brass">
                    {copy.soon}
                  </span>
                ) : null}
              </span>
              <span className="flex-1 text-xs leading-relaxed text-muted">{item.hint}</span>
            </>
          );

          return (
            <li key={tool.id} className="h-full">
              {tool.status === 'link' && tool.href ? (
                <Link href={localePath(locale, tool.href)} className={className}>
                  {body}
                </Link>
              ) : (
                <button
                  type="button"
                  className={className}
                  aria-pressed={
                    tool.id === 'generate' ||
                    tool.id === 'variants' ||
                    tool.id === 'families' ||
                    tool.id === 'chat' ||
                    tool.id === 'createCard'
                      ? panel === tool.id
                      : tool.id === 'import'
                        ? importOpen
                        : undefined
                  }
                  onClick={() => onTool(tool.id)}>
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {notice ? (
        <button
          type="button"
          className="mt-3 w-full cursor-pointer rounded-box border border-brass/20 bg-brass-tint px-4 py-3 text-left text-sm text-brass-strong transition-colors hover:border-brass/40 hover:bg-brass-tint/80"
          aria-label={copy.dismissNotice}
          onClick={onDismissNotice}>
          {notice}
        </button>
      ) : null}
    </section>
  );
}
