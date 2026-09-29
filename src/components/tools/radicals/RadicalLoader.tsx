'use client';

import dynamic from 'next/dynamic';
import type { Dictionary } from '@/i18n/types';

export interface RadicalLoaderProps {
  locale: string;
  copy: Dictionary['radicalTool'];
  title: string;
  description: string;
  embedded?: boolean;
}

const RadicalCalculator = dynamic<RadicalLoaderProps>(
  () => import('./RadicalCalculator').then((m) => m.RadicalCalculator),
  { ssr: false, loading: () => <Skeleton /> },
);

export function RadicalLoader(props: RadicalLoaderProps) {
  return <RadicalCalculator {...props} />;
}

function Skeleton() {
  return (
    <div className="h-80 animate-pulse rounded-box border border-hairline bg-white dark:bg-slate-900" />
  );
}
