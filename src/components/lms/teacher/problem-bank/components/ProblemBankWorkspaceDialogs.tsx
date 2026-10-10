'use client';

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { Locale } from '@/i18n/config';
import {
  toPersistInput,
  type AiModelId,
  type AiModelStatus,
  type BankProblem,
  type ProblemBankCopy,
  type ProblemDifficulty,
  type ProblemYear,
  type SavedProblemFamily,
} from '@/lib/math/problems';
import { saveToLabAction } from '@/lib/math/problems/actions';
import type { TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';
import { mergeSaved } from '../helpers/problem-bank-merge';
import type { ProblemBankPanel } from '../problem-bank-workspace.types';
import { CreateCustomCardModal } from '../modals/CreateCustomCardModal';
import { EditProblemModal } from '../modals/edit-problem-modal/EditProblemModal';
import { FullSolutionModal } from '../modals/FullSolutionModal';
import { ImportFamilyModal } from '../modals/ImportFamilyModal';
import { FamilyControlCenter } from './FamilyControlCenter';
import { TeacherAiChatPanel } from './teacher-ai-chat-panel/TeacherAiChatPanel';

type ProblemBankWorkspaceDialogsProps = {
  children: ReactNode;
  locale: Locale;
  copy: ProblemBankCopy;
  showSaveToLab: boolean;
  customCardOpen: boolean;
  setCustomCardOpen: Dispatch<SetStateAction<boolean>>;
  saveProblems: (problems: BankProblem[]) => Promise<unknown>;
  setBank: Dispatch<SetStateAction<BankProblem[]>>;
  setLabIds: Dispatch<SetStateAction<string[]>>;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  setShowSolution: Dispatch<SetStateAction<boolean>>;
  setNotice: Dispatch<SetStateAction<string | null>>;
  editingProblem: BankProblem | null;
  setEditingProblem: Dispatch<SetStateAction<BankProblem | null>>;
  taxonomyTree: TaxonomyNodeDto[];
  setTaxonomyTree: Dispatch<SetStateAction<TaxonomyNodeDto[]>>;
  saveEditedProblem: (problem: BankProblem) => Promise<boolean>;
  importOpen: boolean;
  setImportOpen: Dispatch<SetStateAction<boolean>>;
  genDifficulty: ProblemDifficulty | 'any';
  genYear: ProblemYear | 'any';
  genModel: AiModelId;
  setGenModel: Dispatch<SetStateAction<AiModelId>>;
  applyCreated: (created: BankProblem[]) => void;
  setFamilies: Dispatch<SetStateAction<SavedProblemFamily[]>>;
  setFocusFamilyId: Dispatch<SetStateAction<string | null>>;
  setPanel: Dispatch<SetStateAction<ProblemBankPanel>>;
  panel: ProblemBankPanel;
  families: SavedProblemFamily[];
  genCount: number;
  focusFamilyId: string | null;
  modelStatus: AiModelStatus[];
  enableSlashPrompts: boolean;
  slashPromptsUserId: string;
  problemChatOpen: boolean;
  setProblemChatOpen: Dispatch<SetStateAction<boolean>>;
  problemChatDraft: string;
  fullSolutionOpen: boolean;
  setFullSolutionOpen: Dispatch<SetStateAction<boolean>>;
  selected: BankProblem | null;
  visible: BankProblem[];
};

export function ProblemBankWorkspaceDialogs({
  children,
  locale,
  copy,
  showSaveToLab,
  customCardOpen,
  setCustomCardOpen,
  saveProblems,
  setBank,
  setLabIds,
  setSelectedId,
  setShowSolution,
  setNotice,
  editingProblem,
  setEditingProblem,
  taxonomyTree,
  setTaxonomyTree,
  saveEditedProblem,
  importOpen,
  setImportOpen,
  genDifficulty,
  genYear,
  genModel,
  setGenModel,
  applyCreated,
  setFamilies,
  setFocusFamilyId,
  setPanel,
  panel,
  families,
  genCount,
  focusFamilyId,
  modelStatus,
  enableSlashPrompts,
  slashPromptsUserId,
  problemChatOpen,
  setProblemChatOpen,
  problemChatDraft,
  fullSolutionOpen,
  setFullSolutionOpen,
  selected,
  visible,
}: ProblemBankWorkspaceDialogsProps) {
  return (
    <>
      {customCardOpen ? (
        <CreateCustomCardModal
          locale={locale}
          copy={copy}
          showSaveToLab={showSaveToLab}
          onClose={() => setCustomCardOpen(false)}
          onSaveToBank={async (problem) => {
            const result = await saveProblems([problem]);
            return Boolean(result);
          }}
          onSaveToLab={
            showSaveToLab
              ? async (problem) => {
                  let payload;
                  try {
                    payload = [toPersistInput(problem, 'lab')];
                  } catch {
                    return false;
                  }
                  const result = await saveToLabAction(payload);
                  if (!result.ok) return false;
                  setBank((current) => mergeSaved(current, result.saved, result.idMap));
                  setLabIds(result.labIds);
                  setSelectedId(result.saved[0]?.id ?? problem.id);
                  setShowSolution(false);
                  setNotice(copy.cardMenu.savedToLab);
                  return true;
                }
              : undefined
          }
        />
      ) : null}
      {editingProblem ? (
        <EditProblemModal
          locale={locale}
          copy={copy}
          problem={editingProblem}
          taxonomyNodes={taxonomyTree}
          onTaxonomyChange={setTaxonomyTree}
          onClose={() => setEditingProblem(null)}
          onSave={saveEditedProblem}
        />
      ) : null}
      {importOpen ? (
        <ImportFamilyModal
          locale={locale}
          copy={copy}
          difficulty={genDifficulty}
          year={genYear}
          model={genModel}
          onClose={() => setImportOpen(false)}
          onCreated={(created) => {
            applyCreated(created);
            setNotice(null);
          }}
          onFamilySaved={(family) => {
            setFamilies((current) => [family, ...current.filter((item) => item.id !== family.id)]);
            setFocusFamilyId(family.id);
            setPanel('families');
            setNotice(copy.importFamily.familySaved);
          }}
        />
      ) : null}
      {panel === 'families' ? (
        <FamilyControlCenter
          locale={locale}
          copy={copy}
          families={families}
          count={genCount}
          difficulty={genDifficulty}
          year={genYear}
          preferredId={focusFamilyId}
          onClose={() => setPanel(null)}
          onFamiliesChange={setFamilies}
          onCreated={(created) => {
            applyCreated(created);
          }}
          onNewFamily={() => setImportOpen(true)}
          onPreferredConsumed={() => setFocusFamilyId(null)}
        />
      ) : null}
      {panel === 'chat' ? (
        <TeacherAiChatPanel
          copy={copy.chat}
          fullCopy={copy}
          model={genModel}
          onModelChange={setGenModel}
          modelStatus={modelStatus}
          onClose={() => setPanel(null)}
          showSaveToLab={showSaveToLab}
          enableSlashPrompts={enableSlashPrompts}
          slashPromptsUserId={slashPromptsUserId}
          className="mt-6"
          onSavedProblems={(saved, target, meta) => {
            setBank((current) => mergeSaved(current, saved, meta?.idMap ?? {}));
            if (target === 'lab' && meta?.labIds) {
              setLabIds(meta.labIds);
            }
            setNotice(target === 'lab' ? copy.chat.savedToLab : copy.chat.savedToBank);
          }}
        />
      ) : null}
      {problemChatOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-ink/35 p-3 sm:items-center sm:justify-center sm:p-6">
          <button
            type="button"
            aria-label={copy.chat.close}
            className="absolute inset-0 cursor-default"
            onClick={() => setProblemChatOpen(false)}
          />
          <div className="relative z-10 w-full max-w-4xl">
            <TeacherAiChatPanel
              key={problemChatDraft}
              copy={copy.chat}
              fullCopy={copy}
              model={genModel}
              onModelChange={setGenModel}
              modelStatus={modelStatus}
              initialDraft={problemChatDraft}
              showSaveToLab={showSaveToLab}
              enableSlashPrompts={enableSlashPrompts}
              slashPromptsUserId={slashPromptsUserId}
              onClose={() => setProblemChatOpen(false)}
              className="max-h-[min(85vh,56rem)] overflow-y-auto"
              onSavedProblems={(saved, target, meta) => {
                setBank((current) => mergeSaved(current, saved, meta?.idMap ?? {}));
                if (target === 'lab' && meta?.labIds) {
                  setLabIds(meta.labIds);
                }
                setNotice(target === 'lab' ? copy.chat.savedToLab : copy.chat.savedToBank);
              }}
            />
          </div>
        </div>
      ) : null}
      {children}
      {fullSolutionOpen && selected ? (
        <FullSolutionModal
          copy={copy}
          problem={selected}
          problems={visible}
          onClose={() => setFullSolutionOpen(false)}
          onSelect={(problemId) => {
            setSelectedId(problemId);
            setShowSolution(true);
          }}
        />
      ) : null}
    </>
  );
}
