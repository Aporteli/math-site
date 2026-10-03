'use client';

import dynamic from 'next/dynamic';
import type { Dictionary } from '@/i18n/types';

export interface PolynomialLoaderProps {
  locale: string;
  copy: Dictionary['polynomialTool'];
  title: string;
  description: string;
}

const PolynomialCalculator = dynamic<PolynomialLoaderProps>(
  () => import('./PolynomialCalculator').then((mod) => mod.PolynomialCalculator),
  { ssr: false, loading: () => <PolynomialSkeleton /> },
);

export function PolynomialLoader(props: PolynomialLoaderProps) {
  return <PolynomialCalculator locale={props.locale} copy={props.copy} title={props.title} description={props.description} />;
}

function PolynomialSkeleton() {
  return (
    <div className="h-80 animate-pulse rounded-box border border-hairline bg-main" />
  );
}