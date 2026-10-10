'use client';

import { Search } from 'lucide-react';

interface CourseSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function CourseSearchField({ value, onChange }: CourseSearchFieldProps) {
  return (
    <div className="relative my-3">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="მოძებნეთ კლასი ან მოსწავლე..."
        className="w-full rounded-box border border-hairline bg-inputs py-2.5 pl-10 pr-4 text-xs font-medium text-ink outline-none focus:ring-2 focus:ring-navy/20 transition"
      />
    </div>
  );
}
