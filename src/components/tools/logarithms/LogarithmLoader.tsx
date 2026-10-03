'use client';

import dynamic from 'next/dynamic';
import type { Dictionary } from '@/i18n/types';

export interface LogarithmLoaderProps {
  locale: string;
  copy: Dictionary['logarithmTool'];
  title: string;
  description: string;
  embedded?: boolean;
}

const LogarithmCalculator = dynamic<LogarithmLoaderProps>(
  () => import('./LogarithmCalculator').then((m) => m.LogarithmCalculator),
  { ssr: false, loading: () => <Skeleton /> },
);

export function LogarithmLoader(props: LogarithmLoaderProps) {
  return <LogarithmCalculator {...props} />;
}

function Skeleton() {
  return (
    <div className="h-80 animate-pulse rounded-box border border-hairline bg-main" />
  );
}