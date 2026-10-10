'use client';

import { useMemo } from 'react';
import type { Locale } from '@/i18n/config';
import {
  PROBLEM_BANK_TOOLS,
  familyKindValue,
  groupedKindsForTopic,
  kindLabel,
  parseFamilyKind,
  type AiModelId,
  type AiModelStatus,
  type BankProblem,
  type ProblemBankCopy,
  type ProblemBankToolId,
  type ProblemFilters,
  type ProblemTopic,
  type SavedProblemFamily,
} from '@/lib/math/problems';
import { filterProblems } from '@/lib/math/problems';
import { childrenOf, taxonomyLabel, type TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';
import { generateLabelsFromFamilies } from '../helpers/problem-bank.helpers';

type UseProblemBankDerivedInput = {
  locale: Locale;
  copy: ProblemBankCopy;
  visibleToolIds?: ProblemBankToolId[];
  bank: BankProblem[];
  filters: ProblemFilters;
  selectedProblemIds: string[];
  taxonomyTree: TaxonomyNodeDto[];
  selectedId: string | null;
  lessonSetIds: string[];
  modelStatus: AiModelStatus[];
  genModel: AiModelId;
  families: SavedProblemFamily[];
  genKind: string;
  genTopic: ProblemTopic | 'any';
};

export function useProblemBankDerived({
  locale,
  copy,
  visibleToolIds,
  bank,
  filters,
  selectedProblemIds,
  taxonomyTree,
  selectedId,
  lessonSetIds,
  modelStatus,
  genModel,
  families,
  genKind,
  genTopic,
}: UseProblemBankDerivedInput) {
  const taxonomyFilterContext = useMemo(() => {
    const topicSlugById: Record<string, string> = {};
    const topicIdsByBranchId: Record<string, string[]> = {};
    const topicSlugsByBranchId: Record<string, string[]> = {};
    for (const node of taxonomyTree) {
      if (node.level !== 'topic') continue;
      topicSlugById[node.id] = node.slug;
      const branchId = node.parentId ?? '';
      if (!branchId) continue;
      (topicIdsByBranchId[branchId] ??= []).push(node.id);
      (topicSlugsByBranchId[branchId] ??= []).push(node.slug);
    }
    return { topicSlugById, topicIdsByBranchId, topicSlugsByBranchId };
  }, [taxonomyTree]);

  const visible = filterProblems(bank, filters, taxonomyFilterContext);
  const visibleIds = useMemo(() => visible.map((problem) => problem.id), [visible]);
  const selectedVisibleIds = useMemo(
    () => selectedProblemIds.filter((id) => visibleIds.includes(id)),
    [selectedProblemIds, visibleIds],
  );
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleIds.length === visibleIds.length;

  const branchOptions = useMemo(() => childrenOf(taxonomyTree, null, 'branch').map((n) => n.id), [taxonomyTree]);
  const topicOptions = useMemo(() => {
    if (filters.branchId === 'all') {
      return taxonomyTree.filter((n) => n.level === 'topic').map((n) => n.id);
    }
    return childrenOf(taxonomyTree, filters.branchId, 'topic').map((n) => n.id);
  }, [taxonomyTree, filters.branchId]);
  const subtopicOptions = useMemo(() => {
    if (filters.topicNodeId === 'all') return [] as string[];
    return childrenOf(taxonomyTree, filters.topicNodeId, 'subtopic').map((n) => n.id);
  }, [taxonomyTree, filters.topicNodeId]);
  const conceptOptions = useMemo(() => {
    if (filters.subtopicId === 'all') return [] as string[];
    return childrenOf(taxonomyTree, filters.subtopicId, 'concept').map((n) => n.id);
  }, [taxonomyTree, filters.subtopicId]);

  const taxonomyLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const node of taxonomyTree) {
      labels[node.id] = taxonomyLabel(node, locale);
    }
    return labels;
  }, [taxonomyTree, locale]);

  const selected = bank.find((problem) => problem.id === selectedId) ?? null;
  const selectedModelStatus = modelStatus.find((status) => status.id === genModel);
  const lessonSet = lessonSetIds
    .map((id) => bank.find((problem) => problem.id === id))
    .filter((problem): problem is BankProblem => Boolean(problem));
  const generatedCount = bank.filter((problem) => problem.source === 'generated' || problem.source === 'ai').length;

  const familyKindOptions = families.map((family) => ({
    value: familyKindValue(family.slug),
    label: family.title || family.slug,
  }));

  const selectedGenerateFamily =
    genKind === 'any' ? null : (families.find((family) => family.slug === parseFamilyKind(genKind)) ?? null);

  const algorithmKindOptions =
    genTopic === 'any'
      ? [{ value: 'any', label: copy.generate.anyKind }]
      : [
          { value: 'any', label: copy.generate.anyKind },
          ...groupedKindsForTopic(genTopic).flatMap((group) => [
            ...(group.groupId
              ? [
                  {
                    heading: copy.generate.kindGroups[group.groupId],
                  },
                ]
              : []),
            ...group.kinds.map((option) => ({
              value: option.id,
              label: kindLabel(copy.generate.kinds, option.id),
            })),
          ]),
        ];

  const familyGenerateTargets: SavedProblemFamily[] = selectedGenerateFamily ? [selectedGenerateFamily] : families;

  const familyGenerateLabels = generateLabelsFromFamilies(familyGenerateTargets);
  const visibleTools = visibleToolIds
    ? PROBLEM_BANK_TOOLS.filter((tool) => visibleToolIds.includes(tool.id))
    : PROBLEM_BANK_TOOLS;

  return {
    visible,
    visibleIds,
    selectedVisibleIds,
    allVisibleSelected,
    branchOptions,
    topicOptions,
    subtopicOptions,
    conceptOptions,
    taxonomyLabels,
    selected,
    selectedModelStatus,
    lessonSet,
    generatedCount,
    familyKindOptions,
    algorithmKindOptions,
    familyGenerateTargets,
    familyGenerateLabels,
    visibleTools,
  };
}
