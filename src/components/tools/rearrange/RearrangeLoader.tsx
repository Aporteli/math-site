'use client';

import dynamic from 'next/dynamic';
import type { Dictionary } from '@/i18n/types';

export interface RearrangeLoaderProps {
  locale: string;
  copy: Dictionary['rearrangeTool'];
  title: string;
  description: string;
  embedded?: boolean;
}

const RearrangeCalculator = dynamic<RearrangeLoaderProps>(
  () => import('./RearrangeCalculator').then((m) => m.RearrangeCalculator),
  { ssr: false, loading: () => <Skeleton /> },
);

export function RearrangeLoader(props: RearrangeLoaderProps) {
  return <RearrangeCalculator {...props} />;
}

function Skeleton() {
  return (
    <div className="h-80 animate-pulse rounded-box border border-hairline bg-main" />
  );
}
