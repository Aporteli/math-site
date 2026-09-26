'use client';

import dynamic from 'next/dynamic';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';

export interface SystemSolverLoaderProps {
  locale: Locale;
  copy: Dictionary['systemSolverTool'];
  title: string;
  description: string;
}

const SystemSolverTool = dynamic<SystemSolverLoaderProps>(
  () => import('./SystemSolver').then((mod) => mod.SystemSolver),
  { ssr: false, loading: () => <SystemSkeleton /> },
);

export function SystemSolverLoader(props: SystemSolverLoaderProps) {
  return <SystemSolverTool {...props} />;
}

function SystemSkeleton() {
  return (
    <div className="bg-paper-deep/60">
      <div className="mx-auto max-w-[1500px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="h-80 animate-pulse rounded-2xl border border-hairline bg-white dark:bg-slate-900" />
      </div>
    </div>
  );
}