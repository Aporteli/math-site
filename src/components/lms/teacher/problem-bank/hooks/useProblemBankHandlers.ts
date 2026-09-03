'use client';

import React, { type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  generateDiverseProblemsAction,
  copyLabToBankAction,
  deleteProblemAction,
  deleteProblemsAction,
  saveProblemsAction,
  saveToLabAction,
  removeFromLabAction,
  removeFromLabBulkAction,
  syncLessonSetAction,
} from '@/lib/math/problems/actions';
import {
  toPersistInput,
  isUnsavedId,
  isCatalogSeedId,
  type BankProblem,
  type ProblemFilters,
  type ProblemTopic,
  type ProblemDifficulty,
  type ProblemYear,
  type SavedProblemFamily,
  type AiModelId,
  type AiCheckMode,
} from '@/lib/math/problems';
import {
  generateFromTemplate,
  stampFamilySource,
  classifyTemplateGenerateFilter,
  parseFamilyKind,
  familyKindValue,
  kindLabel,
  groupedKindsForTopic,
  canResampleProblem,
  canVary,
  templateJsonForProblem,
  generateVariants,
} from '@/lib/math/problems';
import { childrenOf, taxonomyLabel } from '@/lib/math/problems/taxonomy-shared';
import { stashProblemForLab, takeProblemForLab } from '@/lib/math/problems/lab-transfer';
import type { ProblemBankCopy } from '@/lib/math/problems/catalog';
import type { TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';
import type { Locale } from '@/i18n/config';

interface UseProblemBankHandlersProps {
  copy: ProblemBankCopy;
  locale: Locale;
  showSaveToLab: boolean;
  bank: BankProblem[];
  families: SavedProblemFamily[];
  taxonomyTree: TaxonomyNodeDto[];
  labIds: string[];
  draftIds: string[];
  selectedId: string | null;
  editingProblem: BankProblem | null;
  genMode: 'algorithms' | 'diverse' | 'families';
  genTopic: ProblemTopic | 'any';
  genKind: string;
  genDifficulty: ProblemDifficulty | 'any';
  genYear: ProblemYear | 'any';
  genCount: number;
  genRequest: string;
  genReplyLocale: Locale;
  genModel: AiModelId;
  genCheck: AiCheckMode;
  modelStatus: { id: string; wallet: unknown }[];
  variantCount: number;
  selectedProblemIds: string[];
  lessonSetIds: string[];
  filters: ProblemFilters;
  longPressTriggeredRef: React.MutableRefObject<boolean>;
  setBank: React.Dispatch<React.SetStateAction<BankProblem[]>>;
  setDraftIds: React.Dispatch<React.SetStateAction<string[]>>;
  setLabIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  setShowSolution: React.Dispatch<React.SetStateAction<boolean>>;
  setNotice: React.Dispatch<React.SetStateAction<string | null>>;
  setGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setPanel: React.Dispatch<React.SetStateAction<string | null>>;
  setFilters: React.Dispatch<React.SetStateAction<ProblemFilters>>;
  setGenTopic: React.Dispatch<React.SetStateAction<ProblemTopic | 'any'>>;
  setGenKind: React.Dispatch<React.SetStateAction<string>>;
  setGenDifficulty: React.Dispatch<React.SetStateAction<ProblemDifficulty | 'any'>>;
  setGenYear: React.Dispatch<React.SetStateAction<ProblemYear | 'any'>>;
  setGenCount: React.Dispatch<React.SetStateAction<number>>;
  setGenRequest: React.Dispatch<React.SetStateAction<string>>;
  setGenReplyLocale: React.Dispatch<React.SetStateAction<Locale>>;
  setGenModel: React.Dispatch<React.SetStateAction<AiModelId>>;
  setVariantCount: React.Dispatch<React.SetStateAction<number>>;
  setSelectedProblemIds: React.Dispatch<React.SetStateAction<string[]>>;
  setLessonSetIds: React.Dispatch<React.SetStateAction<string[]>>;
  setEditingProblem: React.Dispatch<React.SetStateAction<BankProblem | null>>;
  setProblemChatDraft: React.Dispatch<React.SetStateAction<string>>;
  setProblemChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setFocusFamilyId: React.Dispatch<React.SetStateAction<string | null>>;
  setFamilies: React.Dispatch<React.SetStateAction<SavedProblemFamily[]>>;
  setConfirmBulkDelete: React.Dispatch<React.SetStateAction<boolean>>;
  setBulkSelectMode: React.Dispatch<React.SetStateAction<boolean>>;
  setCustomCardOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setImportOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCasNotice: React.Dispatch<React.SetStateAction<string | null>>;
  setCasOk: React.Dispatch<React.SetStateAction<boolean | null>>;
  setFullSolutionOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setTaxonomyTree: React.Dispatch<React.SetStateAction<TaxonomyNodeDto[]>>;
}

export function useProblemBankHandlers({
  copy,
  locale,
  showSaveToLab,
  bank,
  families,
  taxonomyTree,
  labIds,
  draftIds,
  selectedId,
  editingProblem,
  genMode,
  genTopic,
  genKind,
  genDifficulty,
  genYear,
  genCount,
  genRequest,
  genReplyLocale,
  genModel,
  genCheck,
  modelStatus,
  variantCount,
  selectedProblemIds,
  lessonSetIds,
  filters,
  longPressTriggeredRef,
  setBank,
  setDraftIds,
  setLabIds,
  setSelectedId,
  setShowSolution,
  setNotice,
  setGenerating,
  setSaving,
  setPanel,
  setFilters,
  setGenTopic,
  setGenKind,
  setGenDifficulty,
  setGenYear,
  setGenCount,
  setGenRequest,
  setGenReplyLocale,
  setGenModel,
  setVariantCount,
  setSelectedProblemIds,
  setLessonSetIds,
  setEditingProblem,
  setProblemChatDraft,
  setProblemChatOpen,
  setFocusFamilyId,
  setFamilies,
  setConfirmBulkDelete,
  setBulkSelectMode,
  setCustomCardOpen,
  setImportOpen,
  setCasNotice,
  setCasOk,
  setFullSolutionOpen,
  setTaxonomyTree,
}: UseProblemBankHandlersProps) {
  const router = useRouter();

  function updateTaxonomyFilter(key: 'branchId' | 'topicNodeId' | 'subtopicId' | 'conceptId', value: string) {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === 'branchId') {
        next.topicNodeId = 'all';
        next.subtopicId = 'all';
        next.conceptId = 'all';
      } else if (key === 'topicNodeId') {
        next.subtopicId = 'all';
        next.conceptId = 'all';
      } else if (key === 'subtopicId') {
        next.conceptId = 'all';
      }
      return next;
    });
  }

  function updateFilter<K extends keyof ProblemFilters>(key: K, value: ProblemFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function selectGenTopic(value: ProblemTopic | 'any') {
    setGenTopic(value);
    setGenKind('any');
  }

  function generateFilters() {
    return {
      difficulty: genDifficulty === 'any' ? undefined : genDifficulty,
      year: genYear === 'any' ? undefined : genYear,
    };
  }

  function familyGenerateMissNotice(raw: unknown) {
    const status = classifyTemplateGenerateFilter(raw, generateFilters());
    return status === 'no_match' ? copy.familyCenter.noMatchGenerate : copy.familyCenter.emptyGenerate;
  }

  function generateFromFamilyKind(family: SavedProblemFamily) {
    try {
      const raw = JSON.parse(family.json) as unknown;
      const created = stampFamilySource(
        generateFromTemplate(raw, {
          count: genCount,
          locale,
          ...generateFilters(),
        }),
        family,
      );
      if (created.length === 0) {
        setNotice(familyGenerateMissNotice(raw));
        return;
      }
      applyCreated(created);
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error && error.message.trim() ? error.message : copy.generate.errorFailed);
    }
  }

  function generateFromFamilyList(list: SavedProblemFamily[]) {
    if (list.length === 0) return;
    if (list.length === 1) {
      generateFromFamilyKind(list[0]!);
      return;
    }
    try {
      const filters = generateFilters();
      const usable = list.filter((family) => {
        try {
          return classifyTemplateGenerateFilter(JSON.parse(family.json) as unknown, filters) === 'ok';
        } catch {
          return false;
        }
      });
      if (usable.length === 0) {
        const anyCards = list.some((family) => {
          try {
            return classifyTemplateGenerateFilter(JSON.parse(family.json) as unknown, {}) !== 'empty';
          } catch {
            return false;
          }
        });
        setNotice(anyCards ? copy.familyCenter.noMatchGenerate : copy.familyCenter.emptyGenerate);
        return;
      }
      const created: BankProblem[] = [];
      let remaining = genCount;
      for (let i = 0; i < usable.length; i += 1) {
        const left = usable.length - i;
        const count = i === usable.length - 1 ? remaining : Math.max(1, Math.floor(remaining / left));
        remaining -= count;
        created.push(
          ...stampFamilySource(
            generateFromTemplate(JSON.parse(usable[i]!.json) as unknown, {
              count,
              locale,
              ...filters,
            }),
            usable[i]!,
          ),
        );
      }
      if (created.length === 0) {
        setNotice(copy.familyCenter.noMatchGenerate);
        return;
      }
      applyCreated(created);
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error && error.message.trim() ? error.message : copy.generate.errorFailed);
    }
  }

  function generateSelectedKind(kind: SavedProblemFamily) {
    const kids = families.filter((family) => family.parentId === kind.id);
    if (kids.length > 0) generateFromFamilyList(kids);
    else generateFromFamilyKind(kind);
  }

  function selectGenKind(value: string) {
    setGenKind(value);
    if (genMode === 'families') {
      const slug = parseFamilyKind(value);
      const family = slug ? (families.find((item) => item.slug === slug) ?? null) : null;
      if (family) generateFromFamilyKind(family);
      return;
    }
    const slug = parseFamilyKind(value);
    const family = slug
      ? (families.find(
          (item) => !item.parentId && item.slug === slug && (genTopic === 'any' || item.topic === genTopic),
        ) ?? null)
      : null;
    if (family) generateSelectedKind(family);
  }

  function remapIds(ids: string[], idMap: Record<string, string>) {
    return ids.map((id) => idMap[id] ?? id);
  }

  function mergeSaved(current: BankProblem[], saved: BankProblem[], idMap: Record<string, string>) {
    const replaced = new Set(Object.keys(idMap));
    const savedIds = new Set(saved.map((problem) => problem.id));
    const rest = current.filter((problem) => !replaced.has(problem.id) && !savedIds.has(problem.id));
    return [...saved, ...rest];
  }

  function persistErrorMessage(error: 'unauthorized' | 'failed') {
    return error === 'unauthorized' ? copy.generate.errorUnauthorized : copy.generate.saveFailed;
  }

  async function saveProblems(problems: BankProblem[]) {
    if (problems.length === 0) return null;
    let payload;
    try {
      payload = problems.map((problem) => toPersistInput(problem, 'bank'));
    } catch {
      setNotice(copy.generate.saveFailed);
      return null;
    }
    const result = await saveProblemsAction(payload);
    if (!result.ok) {
      setNotice(persistErrorMessage(result.error));
      return null;
    }

    if (showSaveToLab) {
      const originalIds = new Set(problems.map((problem) => problem.id));
      setBank((current) => current.filter((problem) => !originalIds.has(problem.id)));
      setDraftIds((current) => current.filter((id) => !originalIds.has(id)));
      setLabIds((current) => current.filter((id) => !originalIds.has(id)));
      setSelectedId((current) => (current && originalIds.has(current) ? null : current));
      setNotice(copy.generate.saved.replace('{count}', String(result.saved.length)));
      return result;
    }

    setBank((current) => mergeSaved(current, result.saved, result.idMap));
    setDraftIds((current) =>
      remapIds(
        current.filter((id) => !problems.some((problem) => problem.id === id)),
        result.idMap,
      ),
    );
    setSelectedId((current) => (current ? (result.idMap[current] ?? current) : current));
    setLessonSetIds((current) => remapIds(current, result.idMap));
    setNotice(copy.generate.saved.replace('{count}', String(result.saved.length)));
    return result;
  }

  async function saveProblemToLab(problem: BankProblem) {
    let payload;
    try {
      payload = [toPersistInput(problem, 'lab')];
    } catch {
      setNotice(copy.generate.saveFailed);
      return;
    }
    setSaving(true);
    try {
      const result = await saveToLabAction(payload);
      if (!result.ok) {
        setNotice(persistErrorMessage(result.error));
        return;
      }
      setBank((current) => mergeSaved(current, result.saved, result.idMap));
      setDraftIds((current) =>
        remapIds(
          current.filter((id) => id !== problem.id),
          result.idMap,
        ),
      );
      setSelectedId((current) => (current ? (result.idMap[current] ?? current) : current));
      setLessonSetIds((current) => remapIds(current, result.idMap));
      setLabIds(result.labIds);
      setNotice(copy.cardMenu.savedToLab);
    } finally {
      setSaving(false);
    }
  }

  async function saveEditedProblem(problem: BankProblem): Promise<boolean> {
    const originalId = editingProblem?.id ?? problem.id;
    const inLab =
      showSaveToLab &&
      (labIds.includes(originalId) || problem.collection === 'lab' || editingProblem?.collection === 'lab');

    if (isUnsavedId(originalId)) {
      setBank((current) => current.map((item) => (item.id === originalId ? problem : item)));
      setNotice(copy.editCard.saved);
      return true;
    }

    let payload;
    try {
      payload = [
        toPersistInput({ ...problem, id: originalId, collection: inLab ? 'lab' : 'bank' }, inLab ? 'lab' : 'bank'),
      ];
    } catch {
      setNotice(copy.editCard.errorFailed);
      return false;
    }

    const result = inLab ? await saveToLabAction(payload) : await saveProblemsAction(payload);
    if (!result.ok) {
      setNotice(persistErrorMessage(result.error));
      return false;
    }

    setBank((current) => mergeSaved(current, result.saved, result.idMap));
    setSelectedId((current) => (current ? (result.idMap[current] ?? current) : current));
    setLessonSetIds((current) => remapIds(current, result.idMap));
    if (inLab && 'labIds' in result) {
      setLabIds((result as { labIds: string[] }).labIds);
    }
    setNotice(copy.editCard.saved);
    return true;
  }

  async function copyProblemToBank(problem: BankProblem) {
    if (isUnsavedId(problem.id) || !labIds.includes(problem.id)) {
      await saveProblems([problem]);
      return;
    }
    setSaving(true);
    try {
      const result = await copyLabToBankAction([problem.id]);
      if (!result.ok) {
        setNotice(persistErrorMessage(result.error));
        return;
      }
      if (result.skipped.length > 0 && result.saved.length === 0) {
        setNotice(copy.cardMenu.alreadyInBank);
        return;
      }
      setNotice(copy.cardMenu.savedToBank);
    } finally {
      setSaving(false);
    }
  }

  async function removeProblemFromLab(problem: BankProblem) {
    if (isUnsavedId(problem.id)) {
      setLabIds((current) => current.filter((id) => id !== problem.id));
      setBank((current) => current.filter((item) => item.id !== problem.id));
      setDraftIds((current) => current.filter((id) => id !== problem.id));
      setSelectedProblemIds((current) => current.filter((id) => id !== problem.id));
      if (selectedId === problem.id) {
        setSelectedId(null);
        setShowSolution(false);
      }
      return;
    }

    setSaving(true);
    try {
      const result = await removeFromLabAction(problem.id);
      if (!result.ok) {
        setNotice(persistErrorMessage(result.error));
        return;
      }
      setLabIds((current) => current.filter((id) => id !== problem.id));
      setBank((current) => current.filter((item) => item.id !== problem.id));
      setSelectedProblemIds((current) => current.filter((id) => id !== problem.id));
      if (selectedId === problem.id) {
        setSelectedId(null);
        setShowSolution(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function persistLessonSet(nextIds: string[], currentBank = bank) {
    const members = nextIds
      .map((id) => currentBank.find((problem) => problem.id === id))
      .filter((problem): problem is BankProblem => Boolean(problem));
    const unsaved = members.filter((problem) => isUnsavedId(problem.id));
    let payload;
    try {
      payload = unsaved.map((problem) => toPersistInput(problem));
    } catch {
      setNotice(copy.generate.saveFailed);
      return;
    }
    const result = await syncLessonSetAction(payload, nextIds);
    if (!result.ok) {
      setNotice(persistErrorMessage(result.error));
      return;
    }
    setBank((current) => mergeSaved(current, result.saved, result.idMap));
    setLessonSetIds(result.lessonSetIds);
    setDraftIds((current) =>
      remapIds(
        current.filter((id) => !unsaved.some((problem) => problem.id === id)),
        result.idMap,
      ),
    );
    setSelectedId((current) => (current ? (result.idMap[current] ?? current) : current));
  }

  async function onGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (genMode === 'diverse') {
      setGenerating(true);
      try {
        const result = await generateDiverseProblemsAction({
          request: genRequest,
          locale: genReplyLocale,
          model: genModel,
          check: genCheck,
          count: genCount,
        });
        if (!result.ok) {
          setNotice(result.error === 'unauthorized' ? copy.generate.errorUnauthorized : copy.generate.errorFailed);
          return;
        }
        applyCreated(result.problems);
        setNotice(null);
      } finally {
        setGenerating(false);
      }
      return;
    }

    if (genMode === 'algorithms') {
      setGenerating(true);
      try {
        const result = await generateDiverseProblemsAction({
          topic: genTopic === 'any' ? undefined : genTopic,
          difficulty: genDifficulty === 'any' ? undefined : genDifficulty,
          year: genYear === 'any' ? undefined : genYear,
          count: genCount,
          locale: genReplyLocale,
          check: genCheck,
          model: genModel,
        });
        if (!result.ok) {
          setNotice(result.error === 'unauthorized' ? copy.generate.errorUnauthorized : copy.generate.errorFailed);
          return;
        }
        applyCreated(result.problems);
        setNotice(null);
      } finally {
        setGenerating(false);
      }
      return;
    }

    if (genMode === 'families') {
      const slug = parseFamilyKind(genKind);
      const family = slug ? (families.find((item) => item.slug === slug) ?? null) : null;
      if (family) {
        generateFromFamilyKind(family);
      } else {
        generateFromFamilyList(families);
      }
    }
  }

  function onVariants(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = bank.find((problem) => problem.id === selectedId) ?? null;
    if (!selected) {
      setNotice(copy.variantPanel.needProblem);
      return;
    }

    const template = templateJsonForProblem(selected, families);
    if (!canVary(selected, template)) {
      setNotice(copy.variantPanel.needFormula);
      return;
    }

    try {
      const created = generateVariants(selected, variantCount, {
        template: template ?? undefined,
        locale,
      });
      if (created.length === 0) {
        let familyRaw: unknown = null;
        if (template) {
          try {
            familyRaw = JSON.parse(template) as unknown;
          } catch {
            familyRaw = null;
          }
        }
        setNotice(
          !canResampleProblem(selected, familyRaw)
            ? copy.variantPanel.needSlots
            : copy.variantPanel.noneVerified,
        );
        return;
      }

      applyCreated(created);
      setNotice(null);
    } catch {
      setNotice(copy.variantPanel.noneVerified);
    }
  }

  async function discardProblem(id: string) {
    const problem = bank.find((p) => p.id === id);
    if (!problem) return;

    if (isUnsavedId(id)) {
      setBank((current) => current.filter((item) => item.id !== id));
      setDraftIds((current) => current.filter((item) => item !== id));
      setSelectedId((current) => (current === id ? null : current));
      setLessonSetIds((current) => current.filter((item) => item !== id));
      setSelectedProblemIds((current) => current.filter((item) => item !== id));
      return;
    }

    if (showSaveToLab && labIds.includes(id)) {
      await removeProblemFromLab(problem);
      return;
    }

    const result = await deleteProblemAction(id);
    if (!result.ok) {
      setNotice(copy.generate.errorFailed);
      return;
    }
    setBank((current) => current.filter((item) => item.id !== id));
    setSelectedId((current) => (current === id ? null : current));
    setLessonSetIds((current) => current.filter((item) => item !== id));
    setSelectedProblemIds((current) => current.filter((item) => item !== id));
  }

  async function discardSelectedProblems() {
    const toDelete = selectedProblemIds.filter((id) => !isUnsavedId(id));
    if (toDelete.length === 0) {
      setBank((current) => current.filter((item) => !selectedProblemIds.includes(item.id)));
      setDraftIds((current) => current.filter((id) => !selectedProblemIds.includes(id)));
      setSelectedProblemIds([]);
      setConfirmBulkDelete(false);
      setBulkSelectMode(false);
      return;
    }

    if (showSaveToLab) {
      const labOnly = selectedProblemIds.filter((id) => labIds.includes(id));
      if (labOnly.length === selectedProblemIds.length) {
        const result = await removeFromLabBulkAction(labOnly);
        if (!result.ok) {
          setNotice(copy.generate.errorFailed);
          return;
        }
        setBank((current) => current.filter((item) => !labOnly.includes(item.id)));
        setLabIds((current) => current.filter((id) => !labOnly.includes(id)));
        setSelectedProblemIds([]);
        setConfirmBulkDelete(false);
        setBulkSelectMode(false);
        return;
      }
    }

    const result = await deleteProblemsAction(toDelete);
    if (!result.ok) {
      setNotice(copy.generate.errorFailed);
      return;
    }
    setBank((current) => current.filter((item) => !selectedProblemIds.includes(item.id)));
    setDraftIds((current) => current.filter((id) => !selectedProblemIds.includes(id)));
    setSelectedProblemIds([]);
    setConfirmBulkDelete(false);
    setBulkSelectMode(false);
  }

  function toggleInSet(id: string) {
    setLessonSetIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }
      return [...current, id];
    });
  }

  function toggleProblemSelected(id: string) {
    setSelectedProblemIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }
      return [...current, id];
    });
  }

  function toggleSelectAllVisible(visibleIds: string[]) {
    setSelectedProblemIds((current) => {
      const allSelected = visibleIds.every((id) => current.includes(id));
      if (allSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      return [...new Set([...current, ...visibleIds])];
    });
  }

  function exitBulkSelectMode() {
    setBulkSelectMode(false);
    setSelectedProblemIds([]);
    setConfirmBulkDelete(false);
  }

  function beginCardLongPress(id: string) {
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setBulkSelectMode(true);
      setSelectedProblemIds([id]);
    }, 500);
  }

  function endCardLongPress() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  const longPressTimerRef = React.useRef<number | null>(null);

  function openProblemChat(problem: BankProblem) {
    setSelectedId(problem.id);
    setShowSolution(false);
    setProblemChatDraft(problem.promptTex);
    setProblemChatOpen(true);
  }

  async function copyProblemPrompt(problem: BankProblem) {
    try {
      await navigator.clipboard.writeText(problem.promptTex);
      setNotice(copy.copiedPrompt);
    } catch {
      setNotice(copy.generate.errorFailed);
    }
  }

  function applyCreated(created: BankProblem[]) {
    setBank((current) => [...created, ...current]);
    setDraftIds((current) => [...current, ...created.map((problem) => problem.id)]);
    setSelectedId(created[0]?.id ?? null);
    setShowSolution(false);
  }

  async function saveDraftsToBank() {
    const drafts = draftIds
      .map((id) => bank.find((problem) => problem.id === id))
      .filter((problem): problem is BankProblem => Boolean(problem));
    if (drafts.length === 0) return;
    await saveProblems(drafts);
  }

  function keepAllDrafts() {
    setDraftIds([]);
  }

  return {
    updateTaxonomyFilter,
    updateFilter,
    selectGenTopic,
    selectGenKind,
    onGenerate,
    onVariants,
    discardProblem,
    discardSelectedProblems,
    toggleInSet,
    toggleProblemSelected,
    toggleSelectAllVisible,
    exitBulkSelectMode,
    beginCardLongPress,
    endCardLongPress,
    openProblemChat,
    copyProblemPrompt,
    saveProblems,
    saveProblemToLab,
    saveEditedProblem,
    copyProblemToBank,
    removeProblemFromLab,
    persistLessonSet,
    saveDraftsToBank,
    keepAllDrafts,
    applyCreated,
  };
}
