'use client';

import { SelectMenu } from '@/components/ui/SelectMenu';
import {
  PROBLEM_DIFFICULTIES,
  PROBLEM_YEARS,
  type ProblemBankCopy,
  type ProblemDifficulty,
  type ProblemYear,
} from '@/lib/math/problems';
import { fieldClass } from '../../helpers/problem-bank.helpers';

type FamilyGenerateLabels = {
  years: Set<ProblemYear>;
  difficulties: Set<ProblemDifficulty>;
};

type FamilyGenerateFieldsProps = {
  copy: ProblemBankCopy;
  genId: string;
  genKind: string;
  selectGenKind: (value: string) => void;
  familyKindOptions: { value: string; label: string }[];
  genDifficulty: ProblemDifficulty | 'any';
  setGenDifficulty: (value: ProblemDifficulty | 'any') => void;
  familyGenerateLabels: FamilyGenerateLabels;
  genYear: ProblemYear | 'any';
  setGenYear: (value: ProblemYear | 'any') => void;
  genCount: number;
  setGenCount: (count: number) => void;
  generating: boolean;
};

export function FamilyGenerateFields({
  copy,
  genId,
  genKind,
  selectGenKind,
  familyKindOptions,
  genDifficulty,
  setGenDifficulty,
  familyGenerateLabels,
  genYear,
  setGenYear,
  genCount,
  setGenCount,
  generating,
}: FamilyGenerateFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label htmlFor={`${genId}-family`} className="block text-sm font-medium text-ink">
          {copy.generate.family}
        </label>
        <SelectMenu
          id={`${genId}-family`}
          className="mt-1.5"
          value={genKind}
          onChange={selectGenKind}
          options={[
            {
              value: 'any',
              label: copy.generate.anyFamily,
            },
            ...familyKindOptions,
          ]}
        />
      </div>
      <div>
        <label htmlFor={`${genId}-difficulty`} className="block text-sm font-medium text-ink">
          {copy.generate.difficulty}
        </label>
        <SelectMenu
          id={`${genId}-difficulty`}
          className="mt-1.5"
          value={genDifficulty}
          onChange={(value) => setGenDifficulty(value as ProblemDifficulty | 'any')}
          options={[
            {
              value: 'any' as const,
              label: copy.generate.anyDifficulty,
            },
            ...PROBLEM_DIFFICULTIES.map((difficulty) => {
              const marked = familyGenerateLabels.difficulties.has(difficulty);
              return {
                value: difficulty,
                label: copy.difficulties[difficulty],
                marked,
                hint: marked ? copy.generate.labelInFamily : undefined,
              };
            }),
          ]}
        />
      </div>
      <div>
        <label htmlFor={`${genId}-year`} className="block text-sm font-medium text-ink">
          {copy.generate.year}
        </label>
        <SelectMenu
          id={`${genId}-year`}
          className="mt-1.5"
          value={genYear}
          onChange={(value) => setGenYear(value as ProblemYear | 'any')}
          options={[
            { value: 'any' as const, label: copy.generate.anyYear },
            ...PROBLEM_YEARS.map((year) => {
              const marked = familyGenerateLabels.years.has(year);
              return {
                value: year,
                label: copy.years[year],
                marked,
                hint: marked ? copy.generate.labelInFamily : undefined,
              };
            }),
          ]}
        />
      </div>
      <label className="block text-sm font-medium text-ink">
        {copy.generate.count}
        <input
          className={`${fieldClass} mt-1.5`}
          type="number"
          min={1}
          max={12}
          value={genCount}
          onChange={(event) => setGenCount(Math.min(12, Math.max(1, Number(event.target.value) || 1)))}
        />
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={generating}
          className="inline-flex h-[38px] w-full items-center justify-center rounded-box bg-[#465D73] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#526C85] disabled:opacity-60">
          {generating ? copy.generate.busy : copy.generate.submit}
        </button>
      </div>
    </div>
  );
}
