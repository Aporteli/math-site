'use client';

import { SelectMenu } from '@/components/ui/SelectMenu';
import {
  PROBLEM_DIFFICULTIES,
  PROBLEM_TOPICS,
  PROBLEM_YEARS,
  type ProblemBankCopy,
  type ProblemDifficulty,
  type ProblemTopic,
  type ProblemYear,
} from '@/lib/math/problems';
import { fieldClass } from '../../helpers/problem-bank.helpers';

type DiverseGenerateFieldsProps = {
  copy: ProblemBankCopy;
  genId: string;
  genTopic: ProblemTopic | 'any';
  selectGenTopic: (value: ProblemTopic | 'any') => void;
  genDifficulty: ProblemDifficulty | 'any';
  setGenDifficulty: (value: ProblemDifficulty | 'any') => void;
  genYear: ProblemYear | 'any';
  setGenYear: (value: ProblemYear | 'any') => void;
  genCount: number;
  setGenCount: (count: number) => void;
  generating: boolean;
};

export function DiverseGenerateFields({
  copy,
  genId,
  genTopic,
  selectGenTopic,
  genDifficulty,
  setGenDifficulty,
  genYear,
  setGenYear,
  genCount,
  setGenCount,
  generating,
}: DiverseGenerateFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label htmlFor={`${genId}-topic`} className="block text-sm font-medium text-ink">
          {copy.generate.topic}
        </label>
        <SelectMenu
          id={`${genId}-topic`}
          className="mt-1.5"
          value={genTopic}
          onChange={(value) => selectGenTopic(value as ProblemTopic | 'any')}
          options={[
            { value: 'any' as const, label: copy.generate.anyTopic },
            ...PROBLEM_TOPICS.map((topic) => ({
              value: topic,
              label: copy.topics[topic],
            })),
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
            ...PROBLEM_DIFFICULTIES.map((difficulty) => ({
              value: difficulty,
              label: copy.difficulties[difficulty],
            })),
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
            ...PROBLEM_YEARS.map((year) => ({
              value: year,
              label: copy.years[year],
            })),
          ]}
        />
      </div>
      <label className="block text-sm font-medium text-ink">
        {copy.generate.count}
        <input
          className={`${fieldClass} mt-1.5`}
          type="number"
          min={1}
          max={8}
          value={genCount}
          onChange={(event) => setGenCount(Math.min(8, Math.max(1, Number(event.target.value) || 1)))}
        />
      </label>
      <div className="flex items-end gap-2">
        <button
          type="submit"
          disabled={generating}
          className="inline-flex w-full items-center justify-center rounded-box bg-[#465D73] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#526C85] disabled:opacity-60">
          {generating ? copy.generate.busy : copy.generate.submit}
        </button>
      </div>
    </div>
  );
}
