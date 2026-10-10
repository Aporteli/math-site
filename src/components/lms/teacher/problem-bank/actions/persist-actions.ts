import {
  copyLabToBankAction,
  deleteProblemAction,
  deleteProblemsAction,
  removeFromLabAction,
  removeFromLabBulkAction,
  saveProblemsAction,
  saveToLabAction,
  syncLessonSetAction,
} from '@/lib/math/problems/actions';
import {
  isCatalogSeedId,
  isUnsavedId,
  replaceTokens,
  toPersistInput,
  type BankProblem,
} from '@/lib/math/problems';
import { hideCatalogSeed } from '../helpers/problem-bank.helpers';
import { getLocalDraftProblems, setLocalDraftProblems } from '../helpers/local-drafts';
import { mergeSaved, remapIds } from '../helpers/problem-bank-merge';
import type { ProblemBankActionContext } from './problem-bank-action-context';

export function bindPersistActions(ctx: ProblemBankActionContext) {
  function persistErrorMessage(error: 'unauthorized' | 'failed') {
    return error === 'unauthorized' ? ctx.copy.generate.errorUnauthorized : ctx.copy.generate.saveFailed;
  }

  async function saveProblems(problems: BankProblem[]) {
    if (problems.length === 0) return null;
    let payload;
    try {
      payload = problems.map((problem) => toPersistInput(problem, 'bank'));
    } catch {
      ctx.setNotice(ctx.copy.generate.saveFailed);
      return null;
    }
    const result = await saveProblemsAction(payload);
    if (!result.ok) {
      ctx.setNotice(persistErrorMessage(result.error));
      return null;
    }

    // შენახვის შემდეგ ამოცანების ამოღება LocalStorage-იდან
    const savedIdsSet = new Set(problems.map((p) => p.id));
    setLocalDraftProblems(getLocalDraftProblems().filter((p) => !savedIdsSet.has(p.id)));

    if (ctx.showSaveToLab) {
      const originalIds = new Set(problems.map((problem) => problem.id));
      ctx.setBank((current) => current.filter((problem) => !originalIds.has(problem.id)));
      ctx.setDraftIds((current) => current.filter((id) => !originalIds.has(id)));
      ctx.setLabIds((current) => current.filter((id) => !originalIds.has(id)));
      ctx.setSelectedId((current) => (current && originalIds.has(current) ? null : current));
      ctx.setNotice(replaceTokens(ctx.copy.generate.saved, { count: result.saved.length }));
      return result;
    }

    ctx.setBank((current) => mergeSaved(current, result.saved, result.idMap));
    ctx.setDraftIds((current) =>
      remapIds(
        current.filter((id) => !problems.some((problem) => problem.id === id)),
        result.idMap,
      ),
    );
    ctx.setSelectedId((current) => (current ? (result.idMap[current] ?? current) : current));
    ctx.setLessonSetIds((current) => remapIds(current, result.idMap));
    ctx.setNotice(replaceTokens(ctx.copy.generate.saved, { count: result.saved.length }));
    return result;
  }

  async function saveProblemToLab(problem: BankProblem) {
    let payload;
    try {
      payload = [toPersistInput(problem, 'lab')];
    } catch {
      ctx.setNotice(ctx.copy.generate.saveFailed);
      return;
    }
    ctx.setSaving(true);
    try {
      const result = await saveToLabAction(payload);
      if (!result.ok) {
        ctx.setNotice(persistErrorMessage(result.error));
        return;
      }
      setLocalDraftProblems(getLocalDraftProblems().filter((p) => p.id !== problem.id));
      ctx.setBank((current) => mergeSaved(current, result.saved, result.idMap));
      ctx.setDraftIds((current) =>
        remapIds(
          current.filter((id) => id !== problem.id),
          result.idMap,
        ),
      );
      ctx.setSelectedId((current) => (current ? (result.idMap[current] ?? current) : current));
      ctx.setLessonSetIds((current) => remapIds(current, result.idMap));
      ctx.setLabIds(result.labIds);
      ctx.setNotice(ctx.copy.cardMenu.savedToLab);
    } finally {
      ctx.setSaving(false);
    }
  }

  async function saveEditedProblem(problem: BankProblem): Promise<boolean> {
    const originalId = ctx.editingProblem?.id ?? problem.id;
    const inLab =
      ctx.showSaveToLab &&
      (ctx.labIds.includes(originalId) || problem.collection === 'lab' || ctx.editingProblem?.collection === 'lab');

    if (isUnsavedId(originalId)) {
      ctx.setBank((current) => current.map((item) => (item.id === originalId ? problem : item)));
      setLocalDraftProblems(getLocalDraftProblems().map((item) => (item.id === originalId ? problem : item)));
      ctx.setNotice(ctx.copy.editCard.saved);
      return true;
    }

    let payload;
    try {
      payload = [
        toPersistInput(
          { ...problem, id: originalId, collection: inLab ? 'lab' : 'bank' },
          inLab ? 'lab' : 'bank',
        ),
      ];
    } catch {
      ctx.setNotice(ctx.copy.editCard.errorFailed);
      return false;
    }

    const result = inLab ? await saveToLabAction(payload) : await saveProblemsAction(payload);
    if (!result.ok) {
      ctx.setNotice(persistErrorMessage(result.error));
      return false;
    }

    ctx.setBank((current) => mergeSaved(current, result.saved, result.idMap));
    ctx.setSelectedId((current) => (current ? (result.idMap[current] ?? current) : current));
    ctx.setLessonSetIds((current) => remapIds(current, result.idMap));
    if (inLab && 'labIds' in result) {
      ctx.setLabIds((result as { labIds: string[] }).labIds);
    }
    ctx.setNotice(ctx.copy.editCard.saved);
    return true;
  }

  async function copyProblemToBank(problem: BankProblem) {
    if (isUnsavedId(problem.id) || !ctx.labIds.includes(problem.id)) {
      await saveProblems([problem]);
      return;
    }
    ctx.setSaving(true);
    try {
      const result = await copyLabToBankAction([problem.id]);
      if (!result.ok) {
        ctx.setNotice(persistErrorMessage(result.error));
        return;
      }
      if (result.skipped.length > 0 && result.saved.length === 0) {
        ctx.setNotice(ctx.copy.cardMenu.alreadyInBank);
        return;
      }
      ctx.setNotice(ctx.copy.cardMenu.savedToBank);
    } finally {
      ctx.setSaving(false);
    }
  }

  async function removeProblemFromLab(problem: BankProblem) {
    if (isUnsavedId(problem.id)) {
      ctx.setLabIds((current) => current.filter((id) => id !== problem.id));
      ctx.setBank((current) => current.filter((item) => item.id !== problem.id));
      ctx.setDraftIds((current) => current.filter((id) => id !== problem.id));
      ctx.setSelectedProblemIds((current) => current.filter((id) => id !== problem.id));
      setLocalDraftProblems(getLocalDraftProblems().filter((p) => p.id !== problem.id));
      if (ctx.selectedId === problem.id) {
        ctx.setSelectedId(null);
        ctx.setShowSolution(false);
      }
      return;
    }

    ctx.setSaving(true);
    try {
      const result = await removeFromLabAction(problem.id);
      if (!result.ok) {
        ctx.setNotice(persistErrorMessage(result.error));
        return;
      }
      ctx.setLabIds((current) => current.filter((id) => id !== problem.id));
      ctx.setBank((current) => current.filter((item) => item.id !== problem.id));
      ctx.setSelectedProblemIds((current) => current.filter((id) => id !== problem.id));
      if (ctx.selectedId === problem.id) {
        ctx.setSelectedId(null);
        ctx.setShowSolution(false);
      }
    } finally {
      ctx.setSaving(false);
    }
  }

  async function persistLessonSet(nextIds: string[], currentBank = ctx.bank) {
    const members = nextIds
      .map((id) => currentBank.find((problem) => problem.id === id))
      .filter((problem): problem is BankProblem => Boolean(problem));
    const unsaved = members.filter((problem) => isUnsavedId(problem.id));
    let payload;
    try {
      payload = unsaved.map((problem) => toPersistInput(problem));
    } catch {
      ctx.setNotice(ctx.copy.generate.saveFailed);
      return;
    }
    const result = await syncLessonSetAction(payload, nextIds);
    if (!result.ok) {
      ctx.setNotice(persistErrorMessage(result.error));
      return;
    }
    ctx.setBank((current) => mergeSaved(current, result.saved, result.idMap));

    ctx.setDraftIds((current) =>
      remapIds(
        current.filter((id) => !unsaved.some((problem) => problem.id === id)),
        result.idMap,
      ),
    );

    ctx.setSelectedId((current) => (current ? (result.idMap[current] ?? current) : current));
    ctx.setLessonSetIds(result.lessonSetIds);
  }

  async function toggleInSet(id: string) {
    const next = ctx.lessonSetIds.includes(id)
      ? ctx.lessonSetIds.filter((item) => item !== id)
      : [...ctx.lessonSetIds, id];
    ctx.setSaving(true);
    try {
      await persistLessonSet(next);
    } finally {
      ctx.setSaving(false);
    }
  }

  async function discardProblem(id: string) {
    setLocalDraftProblems(getLocalDraftProblems().filter((p) => p.id !== id));

    if (ctx.showSaveToLab && ctx.labIds.includes(id) && !isUnsavedId(id)) {
      ctx.setSaving(true);
      try {
        const result = await removeFromLabAction(id);
        if (!result.ok) {
          ctx.setNotice(persistErrorMessage(result.error));
          return;
        }
        ctx.setLabIds((current) => current.filter((item) => item !== id));
        ctx.setBank((current) => current.filter((problem) => problem.id !== id));
        ctx.setSelectedProblemIds((current) => current.filter((item) => item !== id));
        if (ctx.selectedId === id) {
          ctx.setSelectedId(null);
          ctx.setShowSolution(false);
        }
      } finally {
        ctx.setSaving(false);
      }
      return;
    }

    if (isCatalogSeedId(id)) {
      hideCatalogSeed(id);
    } else if (!isUnsavedId(id)) {
      ctx.setSaving(true);
      const result = await deleteProblemAction(id);
      ctx.setSaving(false);
      if (!result.ok) {
        ctx.setNotice(persistErrorMessage(result.error));
        return;
      }
    }

    const nextSet = ctx.lessonSetIds.filter((item) => item !== id);
    const nextBank = ctx.bank.filter((problem) => problem.id !== id);

    ctx.setBank(nextBank);
    ctx.setLessonSetIds(nextSet);
    ctx.setLabIds((current) => current.filter((item) => item !== id));
    ctx.setDraftIds((current) => current.filter((item) => item !== id));
    ctx.setSelectedProblemIds((current) => current.filter((item) => item !== id));

    if (ctx.selectedId === id) {
      ctx.setSelectedId(null);
      ctx.setShowSolution(false);
    }

    if (!isUnsavedId(id)) {
      ctx.setSaving(true);
      try {
        await persistLessonSet(nextSet, nextBank);
      } finally {
        ctx.setSaving(false);
      }
    }
  }

  async function discardSelectedProblems() {
    const ids = ctx.selectedVisibleIds;
    if (ids.length === 0) return;
    if (!ctx.confirmBulkDelete) {
      ctx.setConfirmBulkDelete(true);
      return;
    }

    const idSet = new Set(ids);
    setLocalDraftProblems(getLocalDraftProblems().filter((p) => !idSet.has(p.id)));

    const labPersisted = ids.filter((id) => ctx.showSaveToLab && ctx.labIds.includes(id) && !isUnsavedId(id));
    const seedIds = ids.filter((id) => isCatalogSeedId(id));
    const bankPersisted = ids.filter(
      (id) => !isUnsavedId(id) && !isCatalogSeedId(id) && !(ctx.showSaveToLab && ctx.labIds.includes(id)),
    );

    ctx.setSaving(true);
    ctx.setNotice(null);
    try {
      if (labPersisted.length > 0) {
        for (let i = 0; i < labPersisted.length; i += 48) {
          const chunk = labPersisted.slice(i, i + 48);
          const result = await removeFromLabBulkAction(chunk);
          if (!result.ok) {
            ctx.setNotice(persistErrorMessage(result.error));
            ctx.setConfirmBulkDelete(false);
            return;
          }
        }
      }
      if (bankPersisted.length > 0) {
        for (let i = 0; i < bankPersisted.length; i += 48) {
          const chunk = bankPersisted.slice(i, i + 48);
          const result = await deleteProblemsAction(chunk);
          if (!result.ok) {
            ctx.setNotice(persistErrorMessage(result.error));
            ctx.setConfirmBulkDelete(false);
            return;
          }
        }
      }
      for (const id of seedIds) {
        hideCatalogSeed(id);
      }

      const nextBank = ctx.bank.filter((problem) => !idSet.has(problem.id));
      const nextSet = ctx.lessonSetIds.filter((id) => !idSet.has(id));
      ctx.setBank(nextBank);
      ctx.setLessonSetIds(nextSet);
      ctx.setLabIds((current) => current.filter((id) => !idSet.has(id)));
      ctx.setDraftIds((current) => current.filter((id) => !idSet.has(id)));
      ctx.setSelectedProblemIds([]);
      ctx.setConfirmBulkDelete(false);
      ctx.setBulkSelectMode(false);
      if (ctx.selectedId && idSet.has(ctx.selectedId)) {
        ctx.setSelectedId(null);
        ctx.setShowSolution(false);
      }
      if (bankPersisted.length > 0 || seedIds.length > 0) {
        await persistLessonSet(nextSet, nextBank);
      }
      ctx.setNotice(replaceTokens(ctx.copy.removeSelectedDone, { count: ids.length }));
    } finally {
      ctx.setSaving(false);
    }
  }

  async function keepAllDrafts() {
    const next = [...ctx.lessonSetIds];
    for (const id of ctx.draftIds) {
      if (!next.includes(id)) next.push(id);
    }
    ctx.setSaving(true);
    try {
      await persistLessonSet(next);
    } finally {
      ctx.setSaving(false);
    }
  }

  async function saveDraftsToBank() {
    const drafts = ctx.bank.filter((problem) => ctx.draftIds.includes(problem.id));
    ctx.setSaving(true);
    try {
      const result = await saveProblems(drafts);
      if (result) ctx.setDraftIds([]);
    } finally {
      ctx.setSaving(false);
    }
  }

  return {
    saveProblems,
    saveProblemToLab,
    saveEditedProblem,
    copyProblemToBank,
    removeProblemFromLab,
    toggleInSet,
    discardProblem,
    discardSelectedProblems,
    keepAllDrafts,
    saveDraftsToBank,
  };
}
