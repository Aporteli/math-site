'use client';

import dynamic from 'next/dynamic';
import type { Dictionary } from '@/i18n/types';

export interface UnitCircleLoaderProps {
  locale: string;
  copy: Dictionary['unitCircleTool'];
  title: string;
  description: string;
  embedded?: boolean;
}

const UnitCircleCalculator = dynamic<UnitCircleLoaderProps>(
  () => import('./UnitCircleCalculator').then((m) => m.UnitCircleCalculator),
  { ssr: false, loading: () => <Skeleton /> },
);

export function UnitCircleLoader(props: UnitCircleLoaderProps) {
  return <UnitCircleCalculator {...props} />;
}

function Skeleton() {
  return (
    <div className="h-80 animate-pulse rounded-2xl border border-hairline bg-white dark:bg-slate-900" />
  );
}
