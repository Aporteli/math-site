'use client';

import { SelectMenu } from '@/components/ui/SelectMenu';
import { PROBLEM_YEARS, type ProblemBankCopy, type ProblemYear } from '@/lib/math/problems';

export function YearField({
  id,
  label,
  noYearLabel,
  value,
  years,
  onChange,
}: {
  id: string;
  label: string;
  noYearLabel: string;
  value: ProblemYear | '';
  years: ProblemBankCopy['years'];
  onChange: (value: ProblemYear | '') => void;
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
        onChange={(next) => onChange(next === '' ? '' : (next as ProblemYear))}
        options={[
          { value: '' as const, label: noYearLabel },
          ...PROBLEM_YEARS.map((optionId) => ({
            value: optionId,
            label: years[optionId],
          })),
        ]}
      />
    </div>
  );
}
