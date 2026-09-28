'use client';

import dynamic from 'next/dynamic';
import type { Dictionary } from '@/i18n/types';

export interface VectorLoaderProps {
  locale: string;
  copy: Dictionary['vectorTool'];
  title: string;
  description: string;
  embedded?: boolean;
}

const VectorCalculator = dynamic<VectorLoaderProps>(
  () => import('./VectorCalculator').then((m) => m.VectorCalculator),
  { ssr: false, loading: () => <Skeleton /> },
);

export function VectorLoader(props: VectorLoaderProps) {
  return <VectorCalculator {...props} />;
}

function Skeleton() {
  return (
    <div className="h-80 animate-pulse rounded-2xl border border-hairline bg-white dark:bg-slate-900" />
  );
}
