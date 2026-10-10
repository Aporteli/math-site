'use client';

import type { MutableRefObject } from 'react';
import { KatexPreview } from '@/components/math/katex-preview';
import { localePath, type Locale } from '@/i18n/config';
import {
  canVary,
  isCatalogSeedId,
  isUnsavedId,
  templateJsonForProblem,
  type BankProblem,
  type ProblemBankCopy,
  type SavedProblemFamily,
} from '@/lib/math/problems';
import { stashProblemForLab } from '@/lib/math/problems/lab-transfer';
import type { TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';
import { difficultyTone, problemBranchLabel, sourceBadgeLabel } from '../helpers/problem-bank.helpers';
import type { ProblemBankPanel } from '../problem-bank-workspace.types';
import { ProblemCardMenu } from './problem-card-menu/ProblemCardMenu';

type ProblemBankCardProps = {
  problem: BankProblem;
  selectedId: string | null;
  lessonSetIds: string[];
  selectedProblemIds: string[];
  copy: ProblemBankCopy;
  locale: Locale;
  taxonomyTree: TaxonomyNodeDto[];
  bulkSelectMode: boolean;
  showSaveToLab: boolean;
  showSendToLab: boolean;
  showGenerateVariants: boolean;
  labIds: string[];
  families: SavedProblemFamily[];
  longPressTriggeredRef: MutableRefObject<boolean>;
  beginCardLongPress: (problemId: string) => void;
  endCardLongPress: () => void;
  toggleProblemSelected: (id: string) => void;
  setSelectedId: (id: string) => void;
  setShowSolution: (value: boolean) => void;
  setEditingProblem: (problem: BankProblem) => void;
  openProblemChat: (problem: BankProblem) => void;
  copyProblemPrompt: (problem: BankProblem) => void;
  toggleInSet: (id: string) => void;
  router: { push: (href: string) => void };
  saveProblemToLab: (problem: BankProblem) => void;
  copyProblemToBank: (problem: BankProblem) => void;
  removeProblemFromLab: (problem: BankProblem) => void;
  setPanel: (panel: ProblemBankPanel) => void;
  setNotice: (notice: string | null) => void;
  discardProblem: (id: string) => void;
};

export function ProblemBankCard({
  problem,
  selectedId,
  lessonSetIds,
  selectedProblemIds,
  copy,
  locale,
  taxonomyTree,
  bulkSelectMode,
  showSaveToLab,
  showSendToLab,
  showGenerateVariants,
  labIds,
  families,
  longPressTriggeredRef,
  beginCardLongPress,
  endCardLongPress,
  toggleProblemSelected,
  setSelectedId,
  setShowSolution,
  setEditingProblem,
  openProblemChat,
  copyProblemPrompt,
  toggleInSet,
  router,
  saveProblemToLab,
  copyProblemToBank,
  removeProblemFromLab,
  setPanel,
  setNotice,
  discardProblem,
}: ProblemBankCardProps) {
  const active = problem.id === selectedId;
  const inSet = lessonSetIds.includes(problem.id);
  const checked = selectedProblemIds.includes(problem.id);
  const isSavedInBank = !isUnsavedId(problem.id) && !isCatalogSeedId(problem.id);
  void isSavedInBank;

  return (
    <li
      className={[
        'relative select-none rounded-box border transition-colors',
        active
          ? 'border-hairline bg-mainButton shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
          : 'border-hairline bg-main hover:bg-sectionHeader',
      ].join(' ')}>
      <div className="flex items-start gap-2 px-3.5 py-3 pe-12">
        {bulkSelectMode ? (
          <input
            type="checkbox"
            className="mt-1 size-3.5 shrink-0 rounded border-hairline text-navy focus:ring-navy/30"
            checked={checked}
            aria-label={copy.selectProblem}
            onChange={() => toggleProblemSelected(problem.id)}
            onClick={(event) => event.stopPropagation()}
          />
        ) : null}
        <button
          type="button"
          aria-current={active ? 'true' : undefined}
          className={[
            'flex min-w-0 flex-1 flex-col gap-2.5 text-left transition-colors',
            active ? 'text-ink' : 'hover:text-navy',
          ].join(' ')}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            beginCardLongPress(problem.id);
          }}
          onPointerUp={endCardLongPress}
          onPointerLeave={endCardLongPress}
          onPointerCancel={endCardLongPress}
          onClick={() => {
            if (longPressTriggeredRef.current) {
              longPressTriggeredRef.current = false;
              return;
            }
            if (bulkSelectMode) {
              toggleProblemSelected(problem.id);
              return;
            }
            setSelectedId(problem.id);
            setShowSolution(false);
          }}>
          <span className="flex flex-wrap items-center gap-2">
            <span className={`rounded-box px-2 py-0.5 text-[11px] font-semibold ${difficultyTone[problem.difficulty]}`}>
              {copy.difficulties[problem.difficulty]}
            </span>
            <span className="text-xs font-medium text-muted">
              {problemBranchLabel(copy, problem, taxonomyTree, locale)}
            </span>
            {problem.year ? <span className="text-xs text-muted">{copy.years[problem.year]}</span> : null}
            {problem.source !== 'bank' ? (
              <span className="rounded-box px-2 py-0.5 text-[11px] font-semibold text-brass">
                {sourceBadgeLabel(copy, problem)}
              </span>
            ) : null}
            {inSet ? <span className="ml-auto text-[11px] font-semibold text-navy">{copy.inSet}</span> : null}
            {showSaveToLab && labIds.includes(problem.id) ? (
              <span
                className={[
                  'rounded-box px-2 py-0.5 text-[11px] font-semibold text-brass',
                  inSet ? '' : 'ml-auto',
                ].join(' ')}>
                {copy.stats.inLab}
              </span>
            ) : null}
            {!showSaveToLab && !isUnsavedId(problem.id) && !isCatalogSeedId(problem.id) ? (
              <span
                className={[
                  'rounded-box  px-2 py-0.5 text-[11px] font-semibold text-navy',
                  inSet ? '' : 'ml-auto',
                ].join(' ')}>
                {copy.stats.inBank}
              </span>
            ) : null}
          </span>
          <span className="block min-w-0 overflow-x-auto hide-scrollbar">
            <KatexPreview tex={problem.promptTex} className="text-ink [&_.katex]:text-[0.95rem]" />
          </span>
        </button>
      </div>
      <ProblemCardMenu
        problem={problem}
        copy={copy}
        inSet={inSet}
        inLab={labIds.includes(problem.id)}
        showSendToLab={showSendToLab}
        showSaveToLab={showSaveToLab}
        showGenerateVariants={showGenerateVariants}
        canGenerateVariants={canVary(problem, templateJsonForProblem(problem, families))}
        onEdit={(item) => {
          setSelectedId(item.id);
          setEditingProblem(item);
        }}
        onAskAi={openProblemChat}
        onCopyPrompt={(item) => void copyProblemPrompt(item)}
        onToggleSet={(item) => void toggleInSet(item.id)}
        onSendToLab={
          showSendToLab
            ? (item) => {
                stashProblemForLab(item);
                router.push(localePath(locale, '/teacher/lab'));
              }
            : undefined
        }
        onSaveToLab={showSaveToLab ? (item) => void saveProblemToLab(item) : undefined}
        onSaveToBank={showSaveToLab ? (item) => void copyProblemToBank(item) : undefined}
        onRemoveFromLab={showSaveToLab ? (item) => void removeProblemFromLab(item) : undefined}
        onGenerateVariants={
          showGenerateVariants
            ? (item) => {
                setSelectedId(item.id);
                setShowSolution(false);
                setPanel('variants');
                setNotice(null);
              }
            : undefined
        }
        onDiscard={(item) => void discardProblem(item.id)}
      />
    </li>
  );
}
