'use client';

import dynamic from 'next/dynamic';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';

const GraphingTool = dynamic(() => import('./GraphingTool').then((mod) => mod.GraphingTool), {
  ssr: false,
  loading: () => <GraphingSkeleton />,
});

export function GraphingToolLoader({
  locale,
  copy,
  title,
  description,
}: {
  locale: Locale;
  copy: Dictionary['graphingTool'];
  title: string;
  description: string;
}) {
  return <GraphingTool locale={locale} copy={copy} title={title} description={description} />;
}

function GraphingSkeleton() {
  return <div className="h-80 animate-pulse rounded-box border border-hairline bg-main" />;
}
