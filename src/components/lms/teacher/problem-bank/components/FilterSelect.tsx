'use client';

import { useId } from 'react';
import { SelectMenu } from '@/components/ui/SelectMenu';

interface FilterSelectProps<T extends string> {
  label: string;
  value: T | 'all';
  allLabel: string;
  options: readonly T[];
  labels: Record<string, string>;
  onChange: (value: T | 'all') => void;
}

export function FilterSelect<T extends string>({
  label,
  value,
  allLabel,
  options,
  labels,
  onChange,
}: FilterSelectProps<T>) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <SelectMenu
        id={id}
        value={value}
        onChange={onChange}
        options={[
          { value: 'all' as const, label: allLabel },
          ...options.map((option) => ({
            value: option,
            label: labels[option],
          })),
        ]}
      />
    </div>
  );
}
