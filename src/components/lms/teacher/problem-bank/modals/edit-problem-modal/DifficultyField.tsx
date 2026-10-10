'use client';

import { SelectMenu } from '@/components/ui/SelectMenu';
import { PROBLEM_DIFFICULTIES, type ProblemBankCopy, type ProblemDifficulty } from '@/lib/math/problems';

export function DifficultyField({
  id,
  label,
  value,
  difficulties,
  onChange,
}: {
  id: string;
  label: string;
  value: ProblemDifficulty;
  difficulties: ProblemBankCopy['difficulties'];
  onChange: (value: ProblemDifficulty) => void;
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
        onChange={(next) => onChange(next as ProblemDifficulty)}
        options={PROBLEM_DIFFICULTIES.map((optionId) => ({
          value: optionId,
          label: difficulties[optionId],
        }))}
      />
    </div>
  );
}
