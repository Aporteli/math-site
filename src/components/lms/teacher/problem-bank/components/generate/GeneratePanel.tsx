'use client';

import type { FormEvent } from 'react';
import { Save, X } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import type { SelectItem } from '@/components/ui/SelectMenu';
import type {
  AiCheckMode,
  ProblemBankCopy,
  ProblemDifficulty,
  ProblemTopic,
  ProblemYear,
} from '@/lib/math/problems';
import { panelClass } from '../../helpers/problem-bank.helpers';
import type { ProblemGenMode } from '../../problem-bank-workspace.types';
import { AlgorithmGenerateFields } from './AlgorithmGenerateFields';
import { DiverseGenerateFields } from './DiverseGenerateFields';
import { FamilyGenerateFields } from './FamilyGenerateFields';
import { GenerateModeControls } from './GenerateModeControls';

type FamilyGenerateLabels = {
  years: Set<ProblemYear>;
  difficulties: Set<ProblemDifficulty>;
};

type GeneratePanelProps = {
  copy: ProblemBankCopy;
  genId: string;
  onGenerate: (event: FormEvent<HTMLFormElement>) => void;
  setPanel: (panel: null) => void;
  genMode: ProblemGenMode;
  setGenMode: (mode: ProblemGenMode) => void;
  genKind: string;
  setGenKind: (kind: string) => void;
  genCheck: AiCheckMode;
  setGenCheck: (check: AiCheckMode) => void;
  genReplyLocale: Locale;
  setGenReplyLocale: (locale: Locale) => void;
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
  genTopic: ProblemTopic | 'any';
  selectGenTopic: (value: ProblemTopic | 'any') => void;
  algorithmKindOptions: readonly SelectItem<string>[];
  draftIds: string[];
  saving: boolean;
  saveDraftsToBank: () => void;
  keepAllDrafts: () => void;
};

export function GeneratePanel({
  copy,
  genId,
  onGenerate,
  setPanel,
  genMode,
  setGenMode,
  genKind,
  setGenKind,
  genCheck,
  setGenCheck,
  genReplyLocale,
  setGenReplyLocale,
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
  genTopic,
  selectGenTopic,
  algorithmKindOptions,
  draftIds,
  saving,
  saveDraftsToBank,
  keepAllDrafts,
}: GeneratePanelProps) {
  return (
    <form onSubmit={onGenerate} className={`${panelClass} mt-6 space-y-4`} aria-labelledby="generate-heading">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-4">
        <h2 id="generate-heading" className="text-lg font-semibold tracking-tight text-ink">
          {copy.generate.title}
        </h2>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-box text-muted hover:bg-paper hover:text-navy"
          aria-label={copy.generate.close}
          onClick={() => setPanel(null)}>
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="rounded-box border border-hairline bg-sectionHeader p-3">
        <GenerateModeControls
          copy={copy}
          genId={genId}
          genMode={genMode}
          setGenMode={setGenMode}
          genKind={genKind}
          setGenKind={setGenKind}
          genCheck={genCheck}
          setGenCheck={setGenCheck}
          genReplyLocale={genReplyLocale}
          setGenReplyLocale={setGenReplyLocale}
        />
      </div>

      <div className="rounded-box border border-brass/10 bg-brass-tint/30 p-3 sm:p-4">
        {genMode === 'families' ? (
          <FamilyGenerateFields
            copy={copy}
            genId={genId}
            genKind={genKind}
            selectGenKind={selectGenKind}
            familyKindOptions={familyKindOptions}
            genDifficulty={genDifficulty}
            setGenDifficulty={setGenDifficulty}
            familyGenerateLabels={familyGenerateLabels}
            genYear={genYear}
            setGenYear={setGenYear}
            genCount={genCount}
            setGenCount={setGenCount}
            generating={generating}
          />
        ) : genMode === 'algorithms' ? (
          <AlgorithmGenerateFields
            copy={copy}
            genId={genId}
            genTopic={genTopic}
            selectGenTopic={selectGenTopic}
            genKind={genKind}
            selectGenKind={selectGenKind}
            algorithmKindOptions={algorithmKindOptions}
            genDifficulty={genDifficulty}
            setGenDifficulty={setGenDifficulty}
            genYear={genYear}
            setGenYear={setGenYear}
            genCount={genCount}
            setGenCount={setGenCount}
            generating={generating}
          />
        ) : (
          <DiverseGenerateFields
            copy={copy}
            genId={genId}
            genTopic={genTopic}
            selectGenTopic={selectGenTopic}
            genDifficulty={genDifficulty}
            setGenDifficulty={setGenDifficulty}
            genYear={genYear}
            setGenYear={setGenYear}
            genCount={genCount}
            setGenCount={setGenCount}
            generating={generating}
          />
        )}
      </div>
      {draftIds.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving}
            className="inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-navy-strong disabled:opacity-60"
            onClick={() => void saveDraftsToBank()}>
            <Save className="size-4" aria-hidden="true" />
            {saving ? copy.generate.saving : copy.generate.saveToBank}
          </button>
          <button
            type="button"
            disabled={saving}
            className="text-sm font-medium text-navy hover:text-navy-strong disabled:opacity-60"
            onClick={() => void keepAllDrafts()}>
            {copy.generate.keepAll}
          </button>
        </div>
      ) : null}
    </form>
  );
}
