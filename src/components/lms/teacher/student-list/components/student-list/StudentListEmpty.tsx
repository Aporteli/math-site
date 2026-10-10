'use client';

import { Users } from 'lucide-react';

export function StudentListEmpty() {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-box border border-dashed border-hairline bg-surface px-6 py-16 text-center">
      <span className="mb-3 inline-flex size-12 items-center justify-center rounded-box border border-hairline bg-brass-tint text-brass-strong">
        <Users className="size-5" />
      </span>
      <p className="text-sm font-bold text-ink">მოსწავლე ვერ მოიძებნა</p>
      <p className="mt-1 max-w-xs text-xs text-muted">სცადეთ სხვა საძიებო სიტყვა ან შეცვალეთ ჯგუფის ფილტრი.</p>
    </div>
  );
}
