'use client';

import { SelectMenu, type SelectItem } from '@/components/ui/SelectMenu';
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

type AlgorithmGenerateFieldsProps = {
  copy: ProblemBankCopy;
  genId: string;
  genTopic: ProblemTopic | 'any';
  selectGenTopic: (value: ProblemTopic | 'any') => void;
  genKind: string;
  selectGenKind: (value: string) => void;
  algorithmKindOptions: readonly SelectItem<string>[];
  genDifficulty: ProblemDifficulty | 'any';
  setGenDifficulty: (value: ProblemDifficulty | 'any') => void;
  genYear: ProblemYear | 'any';
  setGenYear: (value: ProblemYear | 'any') => void;
  genCount: number;
  setGenCount: (count: number) => void;
  generating: boolean;
};

export function AlgorithmGenerateFields({
  copy,
  genId,
  genTopic,
  selectGenTopic,
  genKind,
  selectGenKind,
  algorithmKindOptions,
  genDifficulty,
  setGenDifficulty,
  genYear,
  setGenYear,
  genCount,
  setGenCount,
  generating,
}: AlgorithmGenerateFieldsProps) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${genTopic !== 'any' ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
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
            {
              value: 'any' as const,
              label: copy.generate.anyTopic,
            },
            ...PROBLEM_TOPICS.map((topic) => ({
              value: topic,
              label: copy.topics[topic],
            })),
          ]}
        />
      </div>
      {genTopic !== 'any' ? (
        <div>
          <label htmlFor={`${genId}-kind`} className="block text-sm font-medium text-ink">
            {copy.generate.kind}
          </label>
          <SelectMenu
            id={`${genId}-kind`}
            className="mt-1.5"
            value={genKind}
            onChange={selectGenKind}
            options={algorithmKindOptions}
          />
        </div>
      ) : null}
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
