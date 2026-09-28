'use client';

import dynamic from 'next/dynamic';
import type { Dictionary } from '@/i18n/types';

export interface GeometryLoaderProps {
  locale: string;
  copy: Dictionary['geometryTool'];
  title: string;
  description: string;
  embedded?: boolean;
}

const GeometryCalculator = dynamic<GeometryLoaderProps>(
  () => import('./GeometryCalculator').then((m) => m.GeometryCalculator),
  { ssr: false, loading: () => <Skeleton /> },
);

export function GeometryLoader(props: GeometryLoaderProps) {
  return <GeometryCalculator {...props} />;
}

function Skeleton() {
  return (
    <div className="h-80 animate-pulse rounded-2xl border border-hairline bg-white dark:bg-slate-900" />
  );
}
