'use client';

import dynamic from 'next/dynamic';
import type { Dictionary } from '@/i18n/types';

export interface CombinatoricsLoaderProps {
  locale: string;
  copy: Dictionary['combinatoricsTool'];
  title: string;
  description: string;
  embedded?: boolean;
}

const CombinatoricsCalculator = dynamic<CombinatoricsLoaderProps>(
  () => import('./CombinatoricsCalculator').then((m) => m.CombinatoricsCalculator),
  { ssr: false, loading: () => <Skeleton /> },
);

export function CombinatoricsLoader(props: CombinatoricsLoaderProps) {
  return <CombinatoricsCalculator {...props} />;
}

function Skeleton() {
  return (
    <div className="h-80 animate-pulse rounded-box border border-hairline bg-white dark:bg-slate-900" />
  );
}
