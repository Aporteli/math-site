'use client';

import dynamic from 'next/dynamic';
import type { Dictionary } from '@/i18n/types';

export interface PolynomialLoaderProps {
  copy: Dictionary['polynomialTool'];
  title: string;
  description: string;
}

const PolynomialCalculator = dynamic<PolynomialLoaderProps>(
  () => import('./PolynomialCalculator').then((mod) => mod.PolynomialCalculator),
  { ssr: false, loading: () => <PolynomialSkeleton /> },
);

export function PolynomialLoader(props: PolynomialLoaderProps) {
  return <PolynomialCalculator {...props} />;
}

function PolynomialSkeleton() {
  return (
    <div className="h-80 animate-pulse rounded-2xl border border-hairline bg-white dark:bg-slate-900" />
  );
}