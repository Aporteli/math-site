'use client';

import { SelectMenu } from '@/components/ui/SelectMenu';
import type { ProblemBankCopy } from '@/lib/math/problems';
import { EDIT_SOURCES, type EditSource } from './types';

export function SourceField({
  id,
  label,
  value,
  sources,
  onChange,
}: {
  id: string;
  label: string;
  value: EditSource;
  sources: ProblemBankCopy['sources'];
  onChange: (value: EditSource) => void;
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
        onChange={(next) => onChange(next as EditSource)}
        options={EDIT_SOURCES.map((optionId) => ({
          value: optionId,
          label: sources[optionId],
        }))}
      />
    </div>
  );
}
