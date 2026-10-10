'use client';

import { Trash2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import { replaceCount, replaceTokens, type BankProblem, type ProblemBankCopy } from '@/lib/math/problems';
import { panelClass } from '../helpers/problem-bank.helpers';
import { ProblemBankCard } from './ProblemBankCard';

type ProblemBankListProps = {
  copy: ProblemBankCopy;
  visible: BankProblem[];
  bulkSelectMode: boolean;
  allVisibleSelected: boolean;
  toggleSelectAllVisible: () => void;
  selectedVisibleIds: string[];
  saving: boolean;
  discardSelectedProblems: () => void;
  confirmBulkDelete: boolean;
  exitBulkSelectMode: () => void;
  cardProps: Omit<ComponentProps<typeof ProblemBankCard>, 'problem'>;
};

export function ProblemBankList({
  copy,
  visible,
  bulkSelectMode,
  allVisibleSelected,
  toggleSelectAllVisible,
  selectedVisibleIds,
  saving,
  discardSelectedProblems,
  confirmBulkDelete,
  exitBulkSelectMode,
  cardProps,
}: ProblemBankListProps) {
  return (
    <section
      className={`${panelClass} order-3 flex min-h-[20rem] min-w-0 flex-col overflow-hidden xl:order-2 xl:min-h-0`}
      aria-label={copy.listLabel}>
      <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />
      <div className="flex shrink-0 flex-wrap bg-sectionHeader items-center justify-between gap-2 border-b border-hairline py-5 px-4">
        <p className="text-sm text-mainText" aria-live="polite">
          {replaceCount(copy.results, visible.length)}
        </p>
        {bulkSelectMode && visible.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-mainText">
              <input
                type="checkbox"
                className="size-3.5 rounded border-hairline text-navy focus:ring-navy/30"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
              />
              {copy.selectAllProblems}
            </label>
            {selectedVisibleIds.length > 0 ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-box bg-mainButton px-2 py-1 text-xs font-medium text-mainText hover:text-navy disabled:opacity-50"
                disabled={saving}
                onClick={() => void discardSelectedProblems()}>
                <Trash2 className="size-3.5" aria-hidden="true" />
                {confirmBulkDelete
                  ? replaceTokens(copy.confirmRemoveSelected, {
                      count: selectedVisibleIds.length,
                    })
                  : `${copy.removeSelectedProblems} (${selectedVisibleIds.length})`}
              </button>
            ) : null}
            <button type="button" className="text-xs font-medium text-muted hover:text-navy" onClick={exitBulkSelectMode}>
              {copy.exitBulkSelect}
            </button>
          </div>
        ) : null}
      </div>
      {visible.length === 0 ? (
        <div className="mt-10 flex flex-1 items-center justify-center text-center">
          <div>
            <p className="font-semibold text-ink">{copy.empty}</p>
            <p className="mt-2 text-sm text-body">{copy.emptyHint}</p>
          </div>
        </div>
      ) : (
        <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto thin-scrollbar pe-0.5 px-4">
          {visible.map((problem) => (
            <ProblemBankCard key={problem.id} problem={problem} {...cardProps} />
          ))}
        </ul>
      )}
    </section>
  );
}
