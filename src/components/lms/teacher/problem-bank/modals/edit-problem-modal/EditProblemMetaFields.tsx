'use client';

import type { ProblemBankCopy, ProblemDifficulty, ProblemYear } from '@/lib/math/problems';
import { DifficultyField } from './DifficultyField';
import { SourceField } from './SourceField';
import type { EditSource } from './types';
import { YearField } from './YearField';

export function EditProblemMetaFields({
  titleId,
  copy,
  difficultyLabel,
  yearLabel,
  noYearLabel,
  sourceLabel,
  difficulty,
  year,
  source,
  onDifficultyChange,
  onYearChange,
  onSourceChange,
}: {
  titleId: string;
  copy: ProblemBankCopy;
  difficultyLabel: string;
  yearLabel: string;
  noYearLabel: string;
  sourceLabel: string;
  difficulty: ProblemDifficulty;
  year: ProblemYear | '';
  source: EditSource;
  onDifficultyChange: (value: ProblemDifficulty) => void;
  onYearChange: (value: ProblemYear | '') => void;
  onSourceChange: (value: EditSource) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <DifficultyField
        id={`${titleId}-difficulty`}
        label={difficultyLabel}
        value={difficulty}
        difficulties={copy.difficulties}
        onChange={onDifficultyChange}
      />
      <YearField
        id={`${titleId}-year`}
        label={yearLabel}
        noYearLabel={noYearLabel}
        value={year}
        years={copy.years}
        onChange={onYearChange}
      />
      <SourceField
        id={`${titleId}-source`}
        label={sourceLabel}
        value={source}
        sources={copy.sources}
        onChange={onSourceChange}
      />
    </div>
  );
}
