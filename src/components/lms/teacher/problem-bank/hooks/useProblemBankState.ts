'use client';

import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { defaultLocale, type Locale } from '@/i18n/config';
import {
  DEFAULT_AI_MODEL,
  EMPTY_PROBLEM_FILTERS,
  type AiCheckMode,
  type AiModelId,
  type AiModelStatus,
  type BankProblem,
  type ProblemDifficulty,
  type ProblemFilters,
  type ProblemTopic,
  type ProblemYear,
  type SavedProblemFamily,
} from '@/lib/math/problems';
import type { TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';
import type { ProblemBankInitialPanel, ProblemBankPanel, ProblemGenMode } from '../problem-bank-workspace.types';

type UseProblemBankStateInput = {
  initialBank: BankProblem[];
  initialLessonSetIds: string[];
  initialLabIds: string[];
  initialPanel: ProblemBankInitialPanel;
  initialFamilies: SavedProblemFamily[];
  taxonomyNodes: TaxonomyNodeDto[];
};

export function useProblemBankState({
  initialBank,
  initialLessonSetIds,
  initialLabIds,
  initialPanel,
  initialFamilies,
  taxonomyNodes,
}: UseProblemBankStateInput) {
  const router = useRouter();
  const searchId = useId();
  const genId = useId();
  const [bank, setBank] = useState<BankProblem[]>(initialBank);
  const [filters, setFilters] = useState<ProblemFilters>(EMPTY_PROBLEM_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(initialBank[0]?.id ?? null);
  const [lessonSetIds, setLessonSetIds] = useState<string[]>(initialLessonSetIds);
  const [labIds, setLabIds] = useState<string[]>(initialLabIds);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [showSolution, setShowSolution] = useState(false);
  const [panel, setPanel] = useState<ProblemBankPanel>(initialPanel);
  const [importOpen, setImportOpen] = useState(false);
  const [customCardOpen, setCustomCardOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<BankProblem | null>(null);
  const [taxonomyTree, setTaxonomyTree] = useState<TaxonomyNodeDto[]>(taxonomyNodes);
  const [selectedProblemIds, setSelectedProblemIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const [fullSolutionOpen, setFullSolutionOpen] = useState(false);
  const [families, setFamilies] = useState<SavedProblemFamily[]>(initialFamilies);
  const [focusFamilyId, setFocusFamilyId] = useState<string | null>(null);
  const [problemChatOpen, setProblemChatOpen] = useState(false);
  const [problemChatDraft, setProblemChatDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [genTopic, setGenTopic] = useState<ProblemTopic | 'any'>('any');
  const [genKind, setGenKind] = useState<string>('any');
  const [genDifficulty, setGenDifficulty] = useState<ProblemDifficulty | 'any'>('any');
  const [genYear, setGenYear] = useState<ProblemYear | 'any'>('any');
  const [genCount, setGenCount] = useState(5);
  const [genMode, setGenMode] = useState<ProblemGenMode>('diverse');
  const [genCheck, setGenCheck] = useState<AiCheckMode>('verified');
  const [genReplyLocale, setGenReplyLocale] = useState<Locale>(defaultLocale);
  const [genModel, setGenModel] = useState<AiModelId>(DEFAULT_AI_MODEL);
  const [modelStatus, setModelStatus] = useState<AiModelStatus[]>([]);
  const [genRequest, setGenRequest] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [variantCount, setVariantCount] = useState(5);
  const [casNotice, setCasNotice] = useState<string | null>(null);
  const [casOk, setCasOk] = useState<boolean | null>(null);

  return {
    router,
    searchId,
    genId,
    bank,
    setBank,
    filters,
    setFilters,
    selectedId,
    setSelectedId,
    lessonSetIds,
    setLessonSetIds,
    labIds,
    setLabIds,
    draftIds,
    setDraftIds,
    showSolution,
    setShowSolution,
    panel,
    setPanel,
    importOpen,
    setImportOpen,
    customCardOpen,
    setCustomCardOpen,
    editingProblem,
    setEditingProblem,
    taxonomyTree,
    setTaxonomyTree,
    selectedProblemIds,
    setSelectedProblemIds,
    confirmBulkDelete,
    setConfirmBulkDelete,
    bulkSelectMode,
    setBulkSelectMode,
    longPressTimerRef,
    longPressTriggeredRef,
    fullSolutionOpen,
    setFullSolutionOpen,
    families,
    setFamilies,
    focusFamilyId,
    setFocusFamilyId,
    problemChatOpen,
    setProblemChatOpen,
    problemChatDraft,
    setProblemChatDraft,
    notice,
    setNotice,
    genTopic,
    setGenTopic,
    genKind,
    setGenKind,
    genDifficulty,
    setGenDifficulty,
    genYear,
    setGenYear,
    genCount,
    setGenCount,
    genMode,
    setGenMode,
    genCheck,
    setGenCheck,
    genReplyLocale,
    setGenReplyLocale,
    genModel,
    setGenModel,
    modelStatus,
    setModelStatus,
    genRequest,
    setGenRequest,
    generating,
    setGenerating,
    saving,
    setSaving,
    variantCount,
    setVariantCount,
    casNotice,
    setCasNotice,
    casOk,
    setCasOk,
  };
}
