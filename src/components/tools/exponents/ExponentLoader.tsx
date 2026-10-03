'use client';

import dynamic from 'next/dynamic';
import type { Dictionary } from '@/i18n/types';

export interface ExponentLoaderProps {
  locale: string;
  copy: Dictionary['exponentTool'];
  title: string;
  description: string;
  embedded?: boolean;
}

const ExponentCalculator = dynamic<ExponentLoaderProps>(
  () => import('./ExponentCalculator').then((m) => m.ExponentCalculator),
  { ssr: false, loading: () => <Skeleton /> },
);

export function ExponentLoader(props: ExponentLoaderProps) {
  return <ExponentCalculator {...props} />;
}

function Skeleton() {
  return <div className="h-80 animate-pulse rounded-box border border-hairline bg-main" />;
}
