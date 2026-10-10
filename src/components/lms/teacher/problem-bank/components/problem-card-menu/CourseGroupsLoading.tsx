'use client';

import { Loader2 } from 'lucide-react';

export function CourseGroupsLoading() {
  return (
    <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs text-muted">
      <Loader2 className="size-5 animate-spin text-navy" />
      <span>კლასები იტვირთება...</span>
    </div>
  );
}
