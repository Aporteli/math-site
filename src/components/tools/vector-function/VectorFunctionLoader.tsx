'use client';

import dynamic from 'next/dynamic';
import type { Dictionary } from '@/i18n/types';

export interface VectorFunctionLoaderProps {
  locale: string;
  copy: Dictionary['vectorFunctionTool'];
  title: string;
  description: string;
}

const VectorGraph = dynamic(
  () => import('./VectorFunction').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <VectorSkeleton />,
  }
);

export function VectorFunctionLoader(props: VectorFunctionLoaderProps) {
  // გადავცემთ ყველა მიღებულ პროპსს დინამიკურ კომპონენტს
  return <VectorGraph {...props} />;
} 

function VectorSkeleton() {
  return (
    <div className="bg-paper-deep/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="h-80 animate-pulse rounded-2xl border border-hairline bg-white" />
      </div>
    </div>
  );
}