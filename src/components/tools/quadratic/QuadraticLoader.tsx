'use client';

import dynamic from 'next/dynamic';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';

interface QuadraticSolverProps {
  locale: Locale;
  copy: Dictionary['equations'];
  title: string;
  description: string;
}

const QuadraticSolver = dynamic<QuadraticSolverProps>(
  () => import('./QuadraticCalculator').then((mod) => mod.QuadraticCalculator),
  {
    ssr: false,
    loading: () => <SolverSkeleton />,
  },
);

export function QuadraticLoader(props: QuadraticSolverProps) {
  return <QuadraticSolver {...props} />;
}

function SolverSkeleton() {
  return (
    <div className="bg-paper-deep/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="h-80 animate-pulse rounded-2xl border border-hairline bg-white dark:bg-slate-900" />
      </div>
    </div>
  );
}
