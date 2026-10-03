'use client';

import dynamic from 'next/dynamic';
import type { Dictionary } from '@/i18n/types';

export interface TriangleLoaderProps {
  locale: string;
  copy: Dictionary['triangleTool'];
  title: string;
  description: string;
}

const TriangleCalculatorLoader = dynamic<TriangleLoaderProps>(
  () => import('./TriangleCalculator').then((m) => m.TriangleCalculator),
  { ssr: false, loading: () => <Skeleton /> },
);

export function TriangleLoader(props: TriangleLoaderProps) {
  return <TriangleCalculatorLoader {...props} />;
}

function Skeleton() {
  return (
    <div className="h-80 animate-pulse rounded-box border border-hairline bg-main" />
  );
}