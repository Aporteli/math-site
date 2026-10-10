'use client';

import type { FormEvent } from 'react';
import { Shuffle, X } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import type { BankProblem, ProblemBankCopy } from '@/lib/math/problems';
import { fieldClass, panelClass } from '../helpers/problem-bank.helpers';

type VariantsPanelProps = {
  copy: ProblemBankCopy;
  onVariants: (event: FormEvent<HTMLFormElement>) => void;
  setPanel: (panel: null) => void;
  selected: BankProblem | null;
  variantCount: number;
  setVariantCount: (count: number) => void;
};

export function VariantsPanel({
  copy,
  onVariants,
  setPanel,
  selected,
  variantCount,
  setVariantCount,
}: VariantsPanelProps) {
  return (
    <form onSubmit={onVariants} className={`${panelClass} mt-6 space-y-4 bg-paper`} aria-labelledby="variants-heading">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-4">
        <h2 id="variants-heading" className="text-lg font-semibold tracking-tight text-ink">
          {copy.variantPanel.title}
        </h2>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-box text-muted hover:bg-paper hover:text-navy"
          aria-label={copy.variantPanel.close}
          onClick={() => setPanel(null)}>
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {selected ? (
        <div className="mt-4 rounded-box bg-paper-deep px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-muted">{copy.variantPanel.sourceLabel}</p>
          <p className="mt-1 text-sm font-medium text-ink">{copy.instructions[selected.instructionId]}</p>
          <div className="mt-2 overflow-x-auto">
            <KatexPreview tex={selected.promptTex} className="text-ink" />
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-body">{copy.variantPanel.needProblem}</p>
      )}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block min-w-[8rem] text-sm font-medium text-ink">
          {copy.variantPanel.count}
          <input
            className={`${fieldClass} mt-1.5`}
            type="number"
            min={1}
            max={12}
            value={variantCount}
            onChange={(event) => setVariantCount(Math.min(12, Math.max(1, Number(event.target.value) || 1)))}
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-box bg-[#465D73] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#526C85]">
          <Shuffle className="size-4" aria-hidden="true" />
          {copy.variantPanel.submit}
        </button>
      </div>
    </form>
  );
}
