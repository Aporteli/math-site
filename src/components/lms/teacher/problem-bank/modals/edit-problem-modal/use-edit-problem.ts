'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import type { BankProblem, ProblemDifficulty, ProblemYear } from '@/lib/math/problems';
import { buildEditedProblem } from './build-edited-problem';
import { initialTaxonomy } from './initial-taxonomy';
import { nextTaxonomySelection } from './next-taxonomy-selection';
import { sourceFromProblem } from './source';
import {
  branchOptionIds,
  conceptOptionIds,
  subtopicOptionIds,
  taxonomyLabelsFor,
  topicOptionIds,
} from './taxonomy-options';
import type { EditProblemModalProps, EditSource, TaxonomySelection } from './types';
import { useEditProblemDismiss } from './use-edit-problem-dismiss';
import { useRefreshTaxonomy } from './use-refresh-taxonomy';

export function useEditProblem({
  locale,
  copy,
  problem,
  taxonomyNodes,
  onTaxonomyChange,
  onClose,
  onSave,
}: EditProblemModalProps) {
  const ui = copy.editCard;
  const titleId = useId();
  const [prompt, setPrompt] = useState(problem.promptTex);
  const [solution, setSolution] = useState(problem.solutionTex);
  const [difficulty, setDifficulty] = useState<ProblemDifficulty>(problem.difficulty);
  const [year, setYear] = useState<ProblemYear | ''>(problem.year ?? '');
  const [source, setSource] = useState<EditSource>(sourceFromProblem(problem));
  const [nodes, setNodes] = useState(taxonomyNodes);
  const [taxonomy, setTaxonomy] = useState(() => initialTaxonomy(problem, taxonomyNodes));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEditProblemDismiss(onClose);
  useRefreshTaxonomy(problem, onTaxonomyChange, setNodes, setTaxonomy);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep the existing prop sync
    setNodes(taxonomyNodes);
  }, [taxonomyNodes]);

  const taxonomyLabels = useMemo(() => taxonomyLabelsFor(nodes, locale), [nodes, locale]);
  const branchOptions = useMemo(() => branchOptionIds(nodes), [nodes]);
  const topicOptions = useMemo(() => topicOptionIds(nodes, taxonomy.branchId), [nodes, taxonomy.branchId]);
  const subtopicOptions = useMemo(
    () => subtopicOptionIds(nodes, taxonomy.topicNodeId),
    [nodes, taxonomy.topicNodeId],
  );
  const conceptOptions = useMemo(() => conceptOptionIds(nodes, taxonomy.subtopicId), [nodes, taxonomy.subtopicId]);

  function updateTaxonomy(key: keyof TaxonomySelection, value: string | 'all') {
    setTaxonomy((current) => nextTaxonomySelection(current, key, value));
  }

  async function onSubmit() {
    const promptTex = prompt.trim();
    const solutionTex = solution.trim();
    if (!promptTex) {
      setNotice(ui.errorEmptyPrompt);
      return;
    }
    if (!solutionTex) {
      setNotice(ui.errorEmptySolution);
      return;
    }

    const next: BankProblem = buildEditedProblem({
      problem,
      source,
      promptTex,
      solutionTex,
      difficulty,
      year,
      taxonomy,
      nodes,
    });

    setBusy(true);
    setNotice(null);
    try {
      const ok = await onSave(next);
      if (ok) onClose();
      else setNotice(ui.errorFailed);
    } catch {
      setNotice(ui.errorFailed);
    } finally {
      setBusy(false);
    }
  }

  return {
    copy,
    ui,
    titleId,
    prompt,
    setPrompt,
    solution,
    setSolution,
    difficulty,
    setDifficulty,
    year,
    setYear,
    source,
    setSource,
    taxonomy,
    busy,
    notice,
    taxonomyLabels,
    branchOptions,
    topicOptions,
    subtopicOptions,
    conceptOptions,
    updateTaxonomy,
    onSubmit,
    onClose,
  };
}
