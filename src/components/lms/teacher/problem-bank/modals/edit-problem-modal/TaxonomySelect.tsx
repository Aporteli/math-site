'use client';

import { SelectMenu } from '@/components/ui/SelectMenu';

export function TaxonomySelect({
  id,
  label,
  value,
  allLabel,
  options,
  labels,
  onChange,
}: {
  id: string;
  label: string;
  value: string | 'all';
  allLabel: string;
  options: readonly string[];
  labels: Record<string, string>;
  onChange: (value: string | 'all') => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink" htmlFor={id}>
        {label}
      </label>
      <SelectMenu
        id={id}
        className="mt-1.5"
        value={value}
        onChange={onChange}
        options={[
          { value: 'all' as const, label: allLabel },
          ...options.map((option) => ({
            value: option,
            label: labels[option] ?? option,
          })),
        ]}
      />
    </div>
  );
}
