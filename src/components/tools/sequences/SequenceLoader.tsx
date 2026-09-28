'use client';

import dynamic from 'next/dynamic';
import type { Dictionary } from '@/i18n/types';

export interface SequenceLoaderProps {
  locale: string;
  copy: Dictionary['sequencesTool'];
  title: string;
  description: string;
  embedded?: boolean;
}

const SequenceCalculator = dynamic<SequenceLoaderProps>(
  () => import('./SequenceCalculator').then((m) => m.SequenceCalculator),
  { ssr: false, loading: () => <Skeleton /> },
);

export function SequenceLoader(props: SequenceLoaderProps) {
  return <SequenceCalculator {...props} />;
}

function Skeleton() {
  return (
    <div className="h-80 animate-pulse rounded-box border border-hairline bg-white dark:bg-slate-900" />
  );
}
