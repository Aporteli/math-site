'use client';

import dynamic from 'next/dynamic';
import type { Dictionary } from '@/i18n/types';

export interface VectorCurveLoaderProps {
  locale: string;
  copy: Dictionary['vectorCurveTool'];
  title: string;
  description: string;
  embedded?: boolean;
}

const VectorCurveCalculator = dynamic<VectorCurveLoaderProps>(
  () => import('./VectorCurveCalculator').then((m) => m.VectorCurveCalculator),
  { ssr: false, loading: () => <Skeleton /> },
);

export function VectorCurveLoader(props: VectorCurveLoaderProps) {
  return <VectorCurveCalculator {...props} />;
}

function Skeleton() {
  return (
    <div className="h-80 animate-pulse rounded-box border border-hairline bg-main" />
  );
}