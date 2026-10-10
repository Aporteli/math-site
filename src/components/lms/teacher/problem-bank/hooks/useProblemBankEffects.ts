'use client';

import { useEffect } from 'react';
import type { BankProblem, SavedProblemFamily } from '@/lib/math/problems';
import { isCatalogSeedId } from '@/lib/math/problems';
import { loadAiModelStatusAction, loadTeacherBankAction, loadTeacherFamiliesAction } from '@/lib/math/problems/actions';
import type { TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';
import { takeProblemForLab } from '@/lib/math/problems/lab-transfer';
import { getLocalDraftProblems } from '../helpers/local-drafts';
import type { useProblemBankState } from './useProblemBankState';

type ProblemBankState = ReturnType<typeof useProblemBankState>;

type UseProblemBankEffectsInput = Pick<
  ProblemBankState,
  | 'setBank'
  | 'setDraftIds'
  | 'setSelectedId'
  | 'setFamilies'
  | 'setModelStatus'
  | 'setShowSolution'
  | 'setNotice'
  | 'setLessonSetIds'
  | 'setTaxonomyTree'
  | 'setCasNotice'
  | 'setCasOk'
  | 'longPressTimerRef'
  | 'selectedId'
> & {
  initialFamilies: SavedProblemFamily[];
  hydrateSavedBank: boolean;
  initialBank: BankProblem[];
  taxonomyNodes: TaxonomyNodeDto[];
};

export function useProblemBankEffects({
  setBank,
  setDraftIds,
  setSelectedId,
  initialFamilies,
  setFamilies,
  setModelStatus,
  hydrateSavedBank,
  setShowSolution,
  setNotice,
  initialBank,
  setLessonSetIds,
  taxonomyNodes,
  setTaxonomyTree,
  selectedId,
  setCasNotice,
  setCasOk,
  longPressTimerRef,
}: UseProblemBankEffectsInput) {
  // LocalStorage-იდან შენახული ამოცანების ჩატვირთვა გვერდის გახსნისას
  useEffect(() => {
    const localProblems = getLocalDraftProblems();
    if (localProblems.length > 0) {
      setBank((current) => {
        const existingIds = new Set(current.map((p) => p.id));
        const incoming = localProblems.filter((p) => !existingIds.has(p.id));
        return incoming.length > 0 ? [...incoming, ...current] : current;
      });
      setDraftIds((current) => [...new Set([...localProblems.map((p) => p.id), ...current])]);
      setSelectedId((current) => current ?? localProblems[0]?.id ?? null);
    }
  }, [setBank, setDraftIds, setSelectedId]);

  useEffect(() => {
    if (initialFamilies.length > 0) return;
    let cancelled = false;
    void loadTeacherFamiliesAction().then((loaded) => {
      if (!cancelled && loaded.length > 0) setFamilies(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [initialFamilies.length, setFamilies]);

  useEffect(() => {
    let cancelled = false;
    void loadAiModelStatusAction().then((status) => {
      if (!cancelled) setModelStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, [setModelStatus]);

  useEffect(() => {
    if (hydrateSavedBank) return;
    const transferred = takeProblemForLab();
    if (!transferred) return;
    setBank((current) => {
      if (current.some((problem) => problem.id === transferred.id)) return current;
      return [transferred, ...current];
    });
    setSelectedId(transferred.id);
    setShowSolution(false);
    setNotice(null);
  }, [hydrateSavedBank, setBank, setNotice, setSelectedId, setShowSolution]);

  useEffect(() => {
    if (!hydrateSavedBank) return;
    if (initialBank.some((problem) => !isCatalogSeedId(problem.id))) return;

    let cancelled = false;
    void loadTeacherBankAction().then((result) => {
      if (cancelled || result.problems.length === 0) return;
      setBank((current) => {
        const ids = new Set(current.map((problem) => problem.id));
        const incoming = result.problems.filter((problem) => !ids.has(problem.id));
        return incoming.length > 0 ? [...incoming, ...current] : current;
      });
      setLessonSetIds(result.lessonSetIds);
      setSelectedId((current) => current ?? result.problems[0]?.id ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [hydrateSavedBank, initialBank, setBank, setLessonSetIds, setSelectedId]);

  useEffect(() => {
    setTaxonomyTree(taxonomyNodes);
  }, [taxonomyNodes, setTaxonomyTree]);

  useEffect(() => {
    setCasNotice(null);
    setCasOk(null);
  }, [selectedId, setCasNotice, setCasOk]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };
  }, [longPressTimerRef]);
}
