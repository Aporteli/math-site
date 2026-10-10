'use client';

import { Expand, Eye, EyeOff, Save, Trash2 } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import type { Locale } from '@/i18n/config';
import { isCatalogSeedId, isUnsavedId, type BankProblem, type ProblemBankCopy } from '@/lib/math/problems';
import type { TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';
import { CopyPromptButton } from './CopyPromptButton';
import { problemBranchLabel } from '../helpers/problem-bank.helpers';

type ProblemPreviewPanelProps = {
  copy: ProblemBankCopy;
  selected: BankProblem | null;
  locale: Locale;
  taxonomyTree: TaxonomyNodeDto[];
  showSaveToLab: boolean;
  labIds: string[];
  showSolution: boolean;
  setShowSolution: (value: boolean | ((value: boolean) => boolean)) => void;
  setFullSolutionOpen: (open: boolean) => void;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  saveProblems: (problems: BankProblem[]) => Promise<unknown>;
  discardProblem: (id: string) => void;
  casNotice: string | null;
  casOk: boolean | null;
};

export function ProblemPreviewPanel({
  copy,
  selected,
  locale,
  taxonomyTree,
  showSaveToLab,
  labIds,
  showSolution,
  setShowSolution,
  setFullSolutionOpen,
  saving,
  setSaving,
  saveProblems,
  discardProblem,
  casNotice,
  casOk,
}: ProblemPreviewPanelProps) {
  return (
    <section
      className="order-2 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-box border border-hairline bg-main shadow-sm xl:order-3"
      aria-label={copy.previewLabel}>
      <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />
      {selected ? (
        <>
          <p className="shrink-0 bg-sectionHeader border-b border-navy/10  text-sm font-semibold tracking-wide text-brass px-4 py-5">
            {copy.prompt}
          </p>
          <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
            <div className="group relative min-w-0 overflow-x-auto rounded-box bg-paper-deep px-4 py-5 pe-12">
              <KatexPreview tex={selected.promptTex} displayMode className="block min-w-0 text-ink" />
              <CopyPromptButton text={selected.promptTex} copyLabel={copy.copyPrompt} copiedLabel={copy.copiedPrompt} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted">
              <span>{problemBranchLabel(copy, selected, taxonomyTree, locale)}</span>
              <span aria-hidden="true">·</span>
              <span>{copy.difficulties[selected.difficulty]}</span>
              {selected.year ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{copy.years[selected.year]}</span>
                </>
              ) : null}
              {showSaveToLab && labIds.includes(selected.id) ? (
                <span className="rounded-box px-2 py-0.5 text-[11px] font-semibold text-brass">{copy.stats.inLab}</span>
              ) : null}
              {!showSaveToLab && !isUnsavedId(selected.id) && !isCatalogSeedId(selected.id) ? (
                <span className="rounded-box  px-2 py-0.5 text-[11px] font-semibold text-navy">{copy.stats.inBank}</span>
              ) : null}
            </div>

            <div className="mt-4 border-t border-navy/10 pt-4">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-navy-strong"
                onClick={() => setShowSolution((value) => !value)}>
                {showSolution ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                {showSolution ? copy.hideSolution : copy.showSolution}
              </button>
              {showSolution ? (
                <>
                  <div className="mt-3 max-h-64 overflow-y-auto overflow-x-auto rounded-box border border-hairline bg-sectionHeader px-4 py-4 sm:max-h-80">
                    <p className="mb-2 text-xs font-semibold tracking-wide text-muted">{copy.solution}</p>
                    <KatexPreview
                      tex={selected.solutionTex}
                      className="block whitespace-pre-wrap break-words text-ink [&_.katex-display]:my-2 [&_.katex]:text-[1.05rem]"
                    />
                  </div>
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-navy-strong"
                    onClick={() => setFullSolutionOpen(true)}>
                    <Expand className="size-4" aria-hidden="true" />
                    {copy.fullSolution.open}
                  </button>
                </>
              ) : null}
            </div>

            <div className="pt-8 mt-3 flex flex-col gap-6 border-t border-navy/10">
              {isUnsavedId(selected.id) && selected.source !== 'bank' ? (
                <button
                  type="button"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-box border border-navy/30 bg-navy-tint px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
                  onClick={() => {
                    void (async () => {
                      setSaving(true);
                      try {
                        await saveProblems([selected]);
                      } finally {
                        setSaving(false);
                      }
                    })();
                  }}>
                  <Save className="size-4" aria-hidden="true" />
                  {saving ? copy.generate.saving : copy.generate.saveToBank}
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-box border border-navy/20 bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm hover:border-navy/40 hover:bg-navy-tint"
                onClick={() => void discardProblem(selected.id)}>
                <Trash2 className="size-4" aria-hidden="true" />
                {selected.source === 'bank' ? copy.generate.remove : copy.generate.discard}
              </button>
              {casNotice ? <p className={casOk ? 'text-sm text-navy' : 'text-sm text-brass-strong'}>{casNotice}</p> : null}
            </div>
          </div>
        </>
      ) : (
        <p className="flex flex-1 items-center text-sm leading-relaxed text-body">{copy.previewEmpty}</p>
      )}
    </section>
  );
}
