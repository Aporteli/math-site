'use client';

import dynamic from 'next/dynamic';
import type { Dictionary } from '@/i18n/types';

export interface InequalityLoaderProps {
  locale: string;
  copy: Dictionary['inequalityTool'];
  title: string;
  description: string;
}

const InequalityCalculatorLoader = dynamic<InequalityLoaderProps>(
  () => import('./InequalityCalculator').then((m) => m.InequalityCalculator),
  { ssr: false, loading: () => <Skeleton /> },
);

export function InequalityLoader(props: InequalityLoaderProps) {
  return <InequalityCalculatorLoader {...props} />;
}

function Skeleton() {
  return (
    <div className="h-80 animate-pulse rounded-box border border-hairline bg-white dark:bg-slate-900" />
  );
}