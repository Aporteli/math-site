'use client';

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calculator,
  Check,
  ChevronDown,
  Copy,
  Expand,
  Eye,
  EyeOff,
  FlaskConical,
  Library,
  Plus,
  Save,
  Shuffle,
  Trash2,
  X,
} from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import { PageHero } from '@/components/ui/page-hero';
import { SelectMenu } from '@/components/ui/select-menu';
import { CopyPromptButton } from './copy-prompt-button';
import { StatRow } from './stat-row';
import { FilterSelect } from './filter-select';
import {
  fieldClass,
  panelClass,
  sourceBadgeLabel,
  problemBranchLabel,
  hideCatalogSeed,
  generateLabelsFromFamilies,
  walletAmount,
  walletChipLabel,
  walletHint,
  walletTone,
  uniqueProviders,
  difficultyTone,
  getNextTaxonomyFilters,
  type TaxonomyFilterKey,
} from './helpers';
import { ImportFamilyModal } from '@/components/lms/problem-bank/import-family-modal';
import { CreateCustomCardModal } from '@/components/lms/problem-bank/create-custom-card-modal';
import { EditProblemModal } from '@/components/lms/problem-bank/edit-problem-modal';
import { FullSolutionModal } from '@/components/lms/problem-bank/full-solution-modal';
import { FamilyControlCenter } from '@/components/lms/problem-bank/family-control-center';
import { ProblemCardMenu } from '@/components/lms/problem-bank/problem-card-menu';
import { TeacherAiChatPanel } from '@/components/lms/problem-bank/teacher-ai-chat-panel';
import { AiProviderIcon } from '@/components/lms/problem-bank/ai-provider-icon';
import { defaultLocale, localePath, locales, type Locale } from '@/i18n/config';
import { handlePlainTextPaste } from '@/lib/helpers/plain-text-paste';
import {
  generateDiverseProblemsAction,
  copyLabToBankAction,
  deleteProblemAction,
  deleteProblemsAction,
  loadAiModelStatusAction,
  loadTeacherBankAction,
  loadTeacherFamiliesAction,
  removeFromLabAction,
  removeFromLabBulkAction,
  saveProblemsAction,
  saveToLabAction,
  syncLessonSetAction,
} from '@/lib/math/problems/actions';
import {
  EMPTY_PROBLEM_FILTERS,
  PROBLEM_BANK_TOOLS,
  PROBLEM_DIFFICULTIES,
  PROBLEM_FILTER_ORIGINS,
  PROBLEM_TOPICS,
  PROBLEM_YEARS,
  AI_MODEL_IDS,
  DEFAULT_AI_MODEL,
  filterProblems,
  familyKindValue,
  generateDiverseProblemsSchema,
  generateFromTemplate,
  classifyTemplateGenerateFilter,
  collectTemplateGenerateLabels,
  generateProblems,
  generateProblemsSchema,
  generateVariants,
  canVary,
  canResampleProblem,
  stampFamilySource,
  checkBankProblem,
  parseFamilyKind,
  templateJsonForProblem,
  HIDDEN_SEED_COOKIE,
  isCatalogSeedId,
  parseHiddenSeedIds,
  isUnsavedId,
  toPersistInput,
  replaceCount,
  replaceTokens,
  groupedKindsForTopic,
  kindLabel,
  topicLabel,
  topicsInBank,
  type AiCheckMode,
  type AiModelId,
  type AiModelStatus,
  type BankProblem,
  type ProblemBankCopy,
  type ProblemBankToolId,
  type ProblemDifficulty,
  type ProblemFilters,
  type ProblemTopic,
  type ProblemYear,
  type SavedProblemFamily,
} from '@/lib/math/problems';
import { childrenOf, taxonomyLabel, type TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';
import { stashProblemForLab, takeProblemForLab } from '@/lib/math/problems/lab-transfer';

interface ProblemBankWorkspaceProps {
  locale: Locale;
  title: string;
  subtitle: string;
  copy: ProblemBankCopy;
  initialBank: BankProblem[];
  initialLessonSetIds: string[];
  initialFamilies?: SavedProblemFamily[];
  /** When true, load saved bank problems if the initial list is only catalog seeds. */
  hydrateSavedBank?: boolean;
  visibleToolIds?: ProblemBankToolId[];
  initialPanel?: 'generate' | 'variants' | 'families' | 'chat' | null;
  showGenerateVariants?: boolean;
  showSendToLab?: boolean;
  showCreateCard?: boolean;
  /** Lab page: persist cards into the lab workspace set and show lab stats. */
  showSaveToLab?: boolean;
  initialLabIds?: string[];
  /** ADMIN-only `/` prompt snippets in AI chat. */
  enableSlashPrompts?: boolean;
  slashPromptsUserId?: string;
  /** Curriculum tree for cascading filters. */
  taxonomyNodes?: TaxonomyNodeDto[];
}

export function ProblemBankWorkspace({
  locale,
  title,
  subtitle,
  copy,
  initialBank,
  initialLessonSetIds,
  initialFamilies = [],
  hydrateSavedBank = true,
  visibleToolIds,
  initialPanel = 'generate',
  showGenerateVariants = true,
  showSendToLab = false,
  showCreateCard = false,
  showSaveToLab = false,
  initialLabIds = [],
  enableSlashPrompts = false,
  slashPromptsUserId = '',
  taxonomyNodes = [],
}: ProblemBankWorkspaceProps) {
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
  const [panel, setPanel] = useState<'generate' | 'variants' | 'families' | 'chat' | null>(initialPanel);
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
  const [genMode, setGenMode] = useState<'algorithms' | 'diverse' | 'families'>('diverse');
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

  useEffect(() => {
    if (initialFamilies.length > 0) return;
    let cancelled = false;
    void loadTeacherFamiliesAction().then((loaded) => {
      if (!cancelled && loaded.length > 0) setFamilies(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [initialFamilies.length]);

  useEffect(() => {
    let cancelled = false;
    void loadAiModelStatusAction().then((status) => {
      if (!cancelled) setModelStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
  }, [hydrateSavedBank]);

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
  }, [hydrateSavedBank, initialBank]);

  useEffect(() => {
    setTaxonomyTree(taxonomyNodes);
  }, [taxonomyNodes]);

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

  function updateTaxonomyFilter(key: TaxonomyFilterKey, value: string) {
    setFilters((current) => getNextTaxonomyFilters(current, key, value));
  }

  const selected = bank.find((problem) => problem.id === selectedId) ?? null;
  const selectedModelStatus = modelStatus.find((status) => status.id === genModel);
  const lessonSet = lessonSetIds
    .map((id) => bank.find((problem) => problem.id === id))
    .filter((problem): problem is BankProblem => Boolean(problem));
  const generatedCount = bank.filter((problem) => problem.source === 'generated' || problem.source === 'ai').length;

  useEffect(() => {
    setCasNotice(null);
    setCasOk(null);
  }, [selectedId]);

  function updateFilter<K extends keyof ProblemFilters>(key: K, value: ProblemFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function selectGenTopic(value: ProblemTopic | 'any') {
    setGenTopic(value);
    setGenKind('any');
  }

  const selectedKindFamily =
    families.find(
      (family) =>
        !family.parentId &&
        family.slug === parseFamilyKind(genKind) &&
        (genTopic === 'any' || family.topic === genTopic),
    ) ?? null;

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

    // On the lab page, bank saves must not stay in the lab list.
    if (showSaveToLab) {
      const originalIds = new Set(problems.map((problem) => problem.id));
      setBank((current) => current.filter((problem) => !originalIds.has(problem.id)));
      setDraftIds((current) => current.filter((id) => !originalIds.has(id)));
      setLabIds((current) => current.filter((id) => !originalIds.has(id)));
      setSelectedId((current) => (current && originalIds.has(current) ? null : current));
      setNotice(replaceTokens(copy.generate.saved, { count: result.saved.length }));
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
    setNotice(replaceTokens(copy.generate.saved, { count: result.saved.length }));
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

  // დამატებულია currentBank პარამეტრი Stale State-ის თავიდან ასაცილებლად
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

    // შესწორება: შენახული ამოცანების გასუფთავება draftIds-დან
    setDraftIds((current) =>
      remapIds(
        current.filter((id) => !unsaved.some((problem) => problem.id === id)),
        result.idMap,
      ),
    );

    setSelectedId((current) => (current ? (result.idMap[current] ?? current) : current));
    setLessonSetIds(result.lessonSetIds);
  }

  async function toggleInSet(id: string) {
    const next = lessonSetIds.includes(id) ? lessonSetIds.filter((item) => item !== id) : [...lessonSetIds, id];
    setSaving(true);
    try {
      await persistLessonSet(next);
    } finally {
      setSaving(false);
    }
  }

  async function discardProblem(id: string) {
    if (showSaveToLab && labIds.includes(id) && !isUnsavedId(id)) {
      setSaving(true);
      try {
        const result = await removeFromLabAction(id);
        if (!result.ok) {
          setNotice(persistErrorMessage(result.error));
          return;
        }
        setLabIds((current) => current.filter((item) => item !== id));
        setBank((current) => current.filter((problem) => problem.id !== id));
        setSelectedProblemIds((current) => current.filter((item) => item !== id));
        if (selectedId === id) {
          setSelectedId(null);
          setShowSolution(false);
        }
      } finally {
        setSaving(false);
      }
      return;
    }

    if (isCatalogSeedId(id)) {
      hideCatalogSeed(id);
    } else if (!isUnsavedId(id)) {
      setSaving(true);
      const result = await deleteProblemAction(id);
      setSaving(false);
      if (!result.ok) {
        setNotice(persistErrorMessage(result.error));
        return;
      }
    }

    const nextSet = lessonSetIds.filter((item) => item !== id);
    const nextBank = bank.filter((problem) => problem.id !== id);

    setBank(nextBank);
    setLessonSetIds(nextSet);
    setLabIds((current) => current.filter((item) => item !== id));
    setDraftIds((current) => current.filter((item) => item !== id));
    setSelectedProblemIds((current) => current.filter((item) => item !== id));

    if (selectedId === id) {
      setSelectedId(null);
      setShowSolution(false);
    }

    if (!isUnsavedId(id)) {
      setSaving(true);
      try {
        await persistLessonSet(nextSet, nextBank);
      } finally {
        setSaving(false);
      }
    }
  }

  async function discardSelectedProblems() {
    const ids = selectedVisibleIds;
    if (ids.length === 0) return;
    if (!confirmBulkDelete) {
      setConfirmBulkDelete(true);
      return;
    }

    const idSet = new Set(ids);
    const labPersisted = ids.filter((id) => showSaveToLab && labIds.includes(id) && !isUnsavedId(id));
    const seedIds = ids.filter((id) => isCatalogSeedId(id));
    const bankPersisted = ids.filter(
      (id) => !isUnsavedId(id) && !isCatalogSeedId(id) && !(showSaveToLab && labIds.includes(id)),
    );

    setSaving(true);
    setNotice(null);
    try {
      if (labPersisted.length > 0) {
        for (let i = 0; i < labPersisted.length; i += 48) {
          const chunk = labPersisted.slice(i, i + 48);
          const result = await removeFromLabBulkAction(chunk);
          if (!result.ok) {
            setNotice(persistErrorMessage(result.error));
            setConfirmBulkDelete(false);
            return;
          }
        }
      }
      if (bankPersisted.length > 0) {
        for (let i = 0; i < bankPersisted.length; i += 48) {
          const chunk = bankPersisted.slice(i, i + 48);
          const result = await deleteProblemsAction(chunk);
          if (!result.ok) {
            setNotice(persistErrorMessage(result.error));
            setConfirmBulkDelete(false);
            return;
          }
        }
      }
      for (const id of seedIds) {
        hideCatalogSeed(id);
      }

      const nextBank = bank.filter((problem) => !idSet.has(problem.id));
      const nextSet = lessonSetIds.filter((id) => !idSet.has(id));
      setBank(nextBank);
      setLessonSetIds(nextSet);
      setLabIds((current) => current.filter((id) => !idSet.has(id)));
      setDraftIds((current) => current.filter((id) => !idSet.has(id)));
      setSelectedProblemIds([]);
      setConfirmBulkDelete(false);
      setBulkSelectMode(false);
      if (selectedId && idSet.has(selectedId)) {
        setSelectedId(null);
        setShowSolution(false);
      }
      if (bankPersisted.length > 0 || seedIds.length > 0) {
        await persistLessonSet(nextSet, nextBank);
      }
      setNotice(replaceTokens(copy.removeSelectedDone, { count: ids.length }));
    } finally {
      setSaving(false);
    }
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function exitBulkSelectMode() {
    clearLongPressTimer();
    setBulkSelectMode(false);
    setSelectedProblemIds([]);
    setConfirmBulkDelete(false);
  }

  function beginCardLongPress(problemId: string) {
    if (bulkSelectMode) return;
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      longPressTimerRef.current = null;
      setBulkSelectMode(true);
      setConfirmBulkDelete(false);
      setSelectedProblemIds([problemId]);
      setSelectedId(problemId);
      setShowSolution(false);
    }, 1000);
  }

  function endCardLongPress() {
    clearLongPressTimer();
  }

  function toggleProblemSelected(id: string) {
    setConfirmBulkDelete(false);
    const next = selectedProblemIds.includes(id)
      ? selectedProblemIds.filter((item) => item !== id)
      : [...selectedProblemIds, id];
    setSelectedProblemIds(next);
    if (next.length === 0) {
      setBulkSelectMode(false);
    }
  }

  function toggleSelectAllVisible() {
    setConfirmBulkDelete(false);
    if (allVisibleSelected) {
      setSelectedProblemIds([]);
      setBulkSelectMode(false);
      return;
    }
    setSelectedProblemIds((current) => [...new Set([...current, ...visibleIds])]);
  }

  useEffect(() => {
    return () => clearLongPressTimer();
  }, []);

  async function keepAllDrafts() {
    const next = [...lessonSetIds];
    for (const id of draftIds) {
      if (!next.includes(id)) next.push(id);
    }
    setSaving(true);
    try {
      await persistLessonSet(next);
    } finally {
      setSaving(false);
    }
  }

  async function saveDraftsToBank() {
    const drafts = bank.filter((problem) => draftIds.includes(problem.id));
    setSaving(true);
    try {
      const result = await saveProblems(drafts);
      if (result) setDraftIds([]);
    } finally {
      setSaving(false);
    }
  }

  function applyCreated(created: BankProblem[]) {
    if (created.length === 0) return;
    setBank((current) => [...created, ...current]);

    // შესწორება: ახალი ამოცანების დამატება არსებულ draftIds-ში ზედწერის ნაცვლად
    setDraftIds((current) => [...created.map((problem) => problem.id), ...current]);

    setSelectedId(created[0]?.id ?? null);
    setShowSolution(false);
    setFilters({
      query: '',
      branchId: 'all',
      topicNodeId: 'all',
      subtopicId: 'all',
      conceptId: 'all',
      difficulty: 'all',
      year: 'all',
      origin: created.every((problem) => problem.templateId === 'ai-plain')
        ? 'unchecked'
        : created.every((problem) => problem.templateId === 'ai-verified')
          ? 'verified'
          : (created[0]?.source ?? 'all'),
    });
  }

  async function onGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (genMode === 'families') {
      if (familyGenerateTargets.length === 0) {
        setNotice(copy.generate.kindJsonNeedFamily);
        return;
      }
      generateFromFamilyList(familyGenerateTargets);
      return;
    }

    if (genMode === 'algorithms') {
      if (selectedKindFamily) {
        generateSelectedKind(selectedKindFamily);
        return;
      }
      const parsed = generateProblemsSchema.safeParse({
        topic: genTopic === 'any' ? undefined : genTopic,
        kind: genKind === 'any' ? undefined : genKind,
        difficulty: genDifficulty === 'any' ? undefined : genDifficulty,
        year: genYear === 'any' ? undefined : genYear,
        count: genCount,
        locale,
      });
      if (!parsed.success) return;
      applyCreated(generateProblems(parsed.data));
      setNotice(null);
      return;
    }

    const parsed = generateDiverseProblemsSchema.safeParse({
      request: genRequest,
      topic: genTopic === 'any' ? undefined : genTopic,
      difficulty: genDifficulty === 'any' ? undefined : genDifficulty,
      year: genYear === 'any' ? undefined : genYear,
      count: Math.min(8, genCount),
      locale: genReplyLocale,
      check: genCheck,
      model: genModel,
    });
    if (!parsed.success) return;

    setGenerating(true);
    setNotice(null);
    try {
      const result = await generateDiverseProblemsAction(parsed.data);

      if (!result.ok) {
        const messages = {
          missing_key: copy.generate.errorMissingKey,
          invalid_key: copy.generate.errorInvalidKey,
          failed: copy.generate.errorFailed,
          none_verified: copy.generate.errorNoneVerified,
          unauthorized: copy.generate.errorUnauthorized,
          limit_exceeded: copy.generate.errorLimit,
          billing: copy.generate.errorBilling,
          timeout: copy.generate.errorTimeout,
          bad_output: copy.generate.errorBadOutput,
        } as const;
        setNotice(messages[result.error]);
        return;
      }

      applyCreated(result.problems);
      void loadAiModelStatusAction().then(setModelStatus);
      if (result.verified < result.requested) {
        setNotice(
          replaceTokens(copy.generate.partial, {
            verified: result.verified,
            requested: result.requested,
          }),
        );
      }
    } catch {
      setNotice(copy.generate.errorFailed);
    } finally {
      setGenerating(false);
    }
  }

  function onVariants(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
          !canResampleProblem(selected, familyRaw) ? copy.variantPanel.needSlots : copy.variantPanel.noneVerified,
        );
        return;
      }

      applyCreated(created);
      setNotice(null);
    } catch {
      setNotice(copy.variantPanel.noneVerified);
    }
  }

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

  function onTool(id: ProblemBankToolId) {
    const tool = PROBLEM_BANK_TOOLS.find((item) => item.id === id);
    if (!tool) return;

    if (id === 'generate' || id === 'variants' || id === 'families' || id === 'chat') {
      setPanel((current) => (current === id ? null : id));
      setNotice(null);
      return;
    }

    if (id === 'import') {
      setImportOpen(true);
      setNotice(null);
      return;
    }

    if (tool.status === 'soon') {
      setNotice(copy.tools[id].hint);
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl">
      <PageHero
        icon={Library}
        eyebrow={copy.eyebrow}
        title={title}
        description={subtitle}
        aside={
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-1">
            <StatRow
              label={showSaveToLab ? copy.stats.inLab : copy.stats.inBank}
              value={showSaveToLab ? labIds.length : bank.length}
            />
            <StatRow label={copy.stats.selected} value={lessonSet.length} />
            <StatRow label={copy.stats.generated} value={generatedCount} />
            {showCreateCard ? (
              <button
                type="button"
                className="col-span-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition-colors hover:border-navy/30 hover:bg-navy-tint/40 sm:col-span-1"
                onClick={() => setCustomCardOpen(true)}>
                {copy.customCard.open}
              </button>
            ) : null}
          </div>
        }
      />

      {visibleTools.length > 0
        ? (console.log(visibleTools, 'visibleTools'),
          (
            <section className="mt-6" aria-label={copy.tools.label}>
              <p className="mb-3 text-sm font-semibold tracking-wide text-brass">{copy.tools.label}</p>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {' '}
                {visibleTools.map((tool) => {
                  const Icon = tool.icon;
                  const item = copy.tools[tool.id];
                  const className = [
                    'flex h-full w-full flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition-all',
                    tool.status === 'ready' && (panel === tool.id || (tool.id === 'import' && importOpen))
                      ? 'border-navy/30 bg-navy-tint shadow-sm'
                      : 'border-hairline bg-white shadow-sm hover:border-navy/30 hover:shadow-md',
                  ].join(' ');

                  const body = (
                    <>
                      <span className="flex items-start gap-2">
                        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy-tint text-navy">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 text-sm font-semibold text-ink">{item.title}</span>
                        {tool.status === 'soon' ? (
                          <span className="ml-auto shrink-0 rounded-full bg-brass-tint px-2 py-0.5 text-[10px] font-semibold tracking-wide text-brass">
                            {copy.soon}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex-1 text-xs leading-relaxed text-muted">{item.hint}</span>
                    </>
                  );

                  return (
                    <li key={tool.id} className="h-full">
                      {tool.status === 'link' && tool.href ? (
                        <Link href={localePath(locale, tool.href)} className={className}>
                          {body}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className={className}
                          aria-pressed={
                            tool.id === 'generate' ||
                            tool.id === 'variants' ||
                            tool.id === 'families' ||
                            tool.id === 'chat' ||
                            tool.id === 'createCard'
                              ? panel === tool.id
                              : tool.id === 'import'
                                ? importOpen
                                : undefined
                          }
                          onClick={() => onTool(tool.id)}>
                          {body}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {notice ? (
                <button
                  type="button"
                  className="mt-3 w-full cursor-pointer rounded-xl border border-brass/20 bg-brass-tint px-4 py-3 text-left text-sm text-brass-strong transition-colors hover:border-brass/40 hover:bg-brass-tint/80"
                  aria-label={copy.dismissNotice}
                  onClick={() => setNotice(null)}>
                  {notice}
                </button>
              ) : null}
            </section>
          ))
        : null}

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

      {panel === 'generate' ? (
        <form onSubmit={onGenerate} className={`${panelClass} mt-6 space-y-4`} aria-labelledby="generate-heading">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-4">
            <h2 id="generate-heading" className="text-lg font-semibold tracking-tight text-ink">
              {copy.generate.title}
            </h2>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-paper hover:text-navy"
              aria-label={copy.generate.close}
              onClick={() => setPanel(null)}>
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="rounded-2xl border border-navy/8 bg-navy-tint/35 p-3">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div
                className="flex w-full flex-col gap-1 rounded-xl border border-navy/15 bg-white/80 p-1 sm:inline-flex sm:w-auto sm:flex-row"
                role="group"
                aria-label={copy.generate.mode}>
                <button
                  type="button"
                  className={[
                    'w-full rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:w-auto sm:py-1.5',
                    genMode === 'diverse' ? 'bg-white text-navy shadow-sm' : 'text-body hover:text-navy',
                  ].join(' ')}
                  aria-pressed={genMode === 'diverse'}
                  onClick={() => setGenMode('diverse')}>
                  {copy.generate.modeDiverse}
                </button>
                <button
                  type="button"
                  className={[
                    'w-full rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:w-auto sm:py-1.5',
                    genMode === 'algorithms' ? 'bg-white text-navy shadow-sm' : 'text-body hover:text-navy',
                  ].join(' ')}
                  aria-pressed={genMode === 'algorithms'}
                  onClick={() => {
                    if (parseFamilyKind(genKind)) {
                      setGenKind('any');
                    }
                    setGenMode('algorithms');
                  }}>
                  {copy.generate.modeAlgorithms}
                </button>
                <button
                  type="button"
                  className={[
                    'w-full rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:w-auto sm:py-1.5',
                    genMode === 'families' ? 'bg-white text-navy shadow-sm' : 'text-body hover:text-navy',
                  ].join(' ')}
                  aria-pressed={genMode === 'families'}
                  onClick={() => {
                    if (!parseFamilyKind(genKind) && genKind !== 'any') {
                      setGenKind('any');
                    }
                    setGenMode('families');
                  }}>
                  {copy.generate.modeFamilies}
                </button>
              </div>
              {genMode === 'diverse' ? (
                <>
                  <div
                    className="flex w-full flex-col gap-1 rounded-xl border border-navy/15 bg-white/80 p-1 sm:inline-flex sm:w-auto sm:flex-row"
                    role="group"
                    aria-label={copy.generate.checkMode}>
                    <button
                      type="button"
                      className={[
                        'w-full rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:w-auto sm:py-1.5',
                        genCheck === 'verified' ? 'bg-white text-navy shadow-sm' : 'text-body hover:text-navy',
                      ].join(' ')}
                      aria-pressed={genCheck === 'verified'}
                      onClick={() => setGenCheck('verified')}>
                      {copy.generate.modeVerified}
                    </button>
                    <button
                      type="button"
                      className={[
                        'w-full rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:w-auto sm:py-1.5',
                        genCheck === 'plain' ? 'bg-white text-navy shadow-sm' : 'text-body hover:text-navy',
                      ].join(' ')}
                      aria-pressed={genCheck === 'plain'}
                      onClick={() => setGenCheck('plain')}>
                      {copy.generate.modePlain}
                    </button>
                  </div>
                  <div className="flex min-w-0 w-full rounded-xl border border-navy/15 bg-white/80 p-1 sm:w-auto sm:min-w-[10.5rem]">
                    <SelectMenu
                      id={`${genId}-reply-language`}
                      className="w-full"
                      triggerClassName="border-0 py-1.5 font-semibold shadow-none hover:border-0 focus-visible:ring-0"
                      value={genReplyLocale}
                      onChange={(value) => setGenReplyLocale(value as Locale)}
                      options={locales.map((id) => ({
                        value: id,
                        label: copy.chat.languages[id],
                      }))}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>
          {genMode === 'diverse' ? (
            <details className="group rounded-2xl border border-hairline-soft bg-paper p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-medium text-ink">{copy.generate.model}</span>
                <ChevronDown
                  className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="mt-3">
                <label htmlFor={`${genId}-model`} className="sr-only">
                  {copy.generate.model}
                </label>
                <SelectMenu
                  id={`${genId}-model`}
                  className="max-w-md"
                  value={genModel}
                  onChange={(value) => setGenModel(value as AiModelId)}
                  options={AI_MODEL_IDS.map((id) => ({
                    value: id,
                    label: copy.generate.models[id],
                  }))}
                />
                {selectedModelStatus ? (
                  <p className="mt-2 text-xs text-body">{walletHint(copy.generate, selectedModelStatus.wallet)}</p>
                ) : null}
                <p className="mt-3 text-xs font-medium text-muted">{copy.generate.walletLabel}</p>
                <ul className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
                  {uniqueProviders(modelStatus).map((status) => {
                    const selected = selectedModelStatus?.provider === status.provider;
                    return (
                      <li key={status.provider} className="min-w-0">
                        <button
                          type="button"
                          className={`flex h-full w-full items-start gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors ${walletTone(status.wallet, selected)}`}
                          onClick={() => {
                            if (selectedModelStatus?.provider === status.provider) {
                              return;
                            }
                            setGenModel(status.id);
                          }}>
                          <AiProviderIcon provider={status.provider} className="mt-0.5 size-4 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block w-full truncate text-[11px] font-medium">
                              {copy.generate.providers[status.provider]}
                            </span>
                            <span className="mt-0.5 block w-full truncate text-[10px] opacity-80">
                              {walletChipLabel(copy.generate, status.wallet)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs font-medium text-muted">{copy.generate.limitLabel}</p>
                <ul className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
                  {modelStatus.map((status) => {
                    const selected = status.id === genModel;
                    const tone = !status.configured
                      ? 'border-hairline bg-white text-muted'
                      : status.limit > 0 && status.remaining <= 0
                        ? 'border-brass/20 bg-brass-tint/40 text-brass-strong'
                        : selected
                          ? 'border-navy/20 bg-navy-tint text-navy'
                          : 'border-hairline bg-white text-body';
                    const detail = !status.configured
                      ? copy.generate.limitNoKey
                      : status.limit > 0 && status.remaining <= 0
                        ? copy.generate.limitExhausted
                        : status.limit === 0
                          ? copy.generate.limitReady
                          : replaceTokens(copy.generate.limitUsed, {
                              used: status.used,
                              limit: status.limit,
                            });

                    return (
                      <li key={status.id} className="min-w-0">
                        <button
                          type="button"
                          className={`flex h-full w-full items-start gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors ${tone}`}
                          onClick={() => setGenModel(status.id)}>
                          <AiProviderIcon provider={status.provider} className="mt-0.5 size-4 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block w-full truncate text-[11px] font-medium">
                              {copy.generate.models[status.id]}
                            </span>
                            <span className="mt-0.5 block w-full truncate text-[10px] opacity-80">{detail}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </details>
          ) : null}
          {genMode === 'diverse' ? (
            <label className="block rounded-2xl border border-hairline-soft bg-paper p-3 text-sm font-medium text-ink">
              {copy.generate.request}
              <textarea
                className={`${fieldClass} mt-1.5 min-h-[4.5rem] resize-y`}
                value={genRequest}
                placeholder={copy.generate.requestPlaceholder}
                maxLength={400}
                onChange={(event) => setGenRequest(event.target.value)}
                onPaste={(event) => handlePlainTextPaste(event, genRequest, setGenRequest, 400)}
              />
            </label>
          ) : null}
          <div className="rounded-2xl border border-brass/10 bg-brass-tint/30 p-3 sm:p-4">
            {genMode === 'families' ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label htmlFor={`${genId}-family`} className="block text-sm font-medium text-ink">
                    {copy.generate.family}
                  </label>
                  <SelectMenu
                    id={`${genId}-family`}
                    className="mt-1.5"
                    value={genKind}
                    onChange={selectGenKind}
                    options={[
                      {
                        value: 'any',
                        label: copy.generate.anyFamily,
                      },
                      ...familyKindOptions,
                    ]}
                  />
                </div>
                <div>
                  <label htmlFor={`${genId}-difficulty`} className="block text-sm font-medium text-ink">
                    {copy.generate.difficulty}
                  </label>
                  <SelectMenu
                    id={`${genId}-difficulty`}
                    className="mt-1.5"
                    value={genDifficulty}
                    onChange={(value) => setGenDifficulty(value as ProblemDifficulty | 'any')}
                    options={[
                      {
                        value: 'any' as const,
                        label: copy.generate.anyDifficulty,
                      },
                      ...PROBLEM_DIFFICULTIES.map((difficulty) => {
                        const marked = familyGenerateLabels.difficulties.has(difficulty);
                        return {
                          value: difficulty,
                          label: copy.difficulties[difficulty],
                          marked,
                          hint: marked ? copy.generate.labelInFamily : undefined,
                        };
                      }),
                    ]}
                  />
                </div>
                <div>
                  <label htmlFor={`${genId}-year`} className="block text-sm font-medium text-ink">
                    {copy.generate.year}
                  </label>
                  <SelectMenu
                    id={`${genId}-year`}
                    className="mt-1.5"
                    value={genYear}
                    onChange={(value) => setGenYear(value as ProblemYear | 'any')}
                    options={[
                      { value: 'any' as const, label: copy.generate.anyYear },
                      ...PROBLEM_YEARS.map((year) => {
                        const marked = familyGenerateLabels.years.has(year);
                        return {
                          value: year,
                          label: copy.years[year],
                          marked,
                          hint: marked ? copy.generate.labelInFamily : undefined,
                        };
                      }),
                    ]}
                  />
                </div>
                <label className="block text-sm font-medium text-ink">
                  {copy.generate.count}
                  <input
                    className={`${fieldClass} mt-1.5`}
                    type="number"
                    min={1}
                    max={12}
                    value={genCount}
                    onChange={(event) => setGenCount(Math.min(12, Math.max(1, Number(event.target.value) || 1)))}
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={generating}
                    className="inline-flex h-[38px] w-full items-center justify-center rounded-xl bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-strong disabled:opacity-60">
                    {generating ? copy.generate.busy : copy.generate.submit}
                  </button>
                </div>
              </div>
            ) : genMode === 'algorithms' ? (
              <div className={`grid gap-3 sm:grid-cols-2 ${genTopic !== 'any' ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
                <div>
                  <label htmlFor={`${genId}-topic`} className="block text-sm font-medium text-ink">
                    {copy.generate.topic}
                  </label>
                  <SelectMenu
                    id={`${genId}-topic`}
                    className="mt-1.5"
                    value={genTopic}
                    onChange={(value) => selectGenTopic(value as ProblemTopic | 'any')}
                    options={[
                      {
                        value: 'any' as const,
                        label: copy.generate.anyTopic,
                      },
                      ...PROBLEM_TOPICS.map((topic) => ({
                        value: topic,
                        label: copy.topics[topic],
                      })),
                    ]}
                  />
                </div>
                {genTopic !== 'any' ? (
                  <div>
                    <label htmlFor={`${genId}-kind`} className="block text-sm font-medium text-ink">
                      {copy.generate.kind}
                    </label>
                    <SelectMenu
                      id={`${genId}-kind`}
                      className="mt-1.5"
                      value={genKind}
                      onChange={selectGenKind}
                      options={algorithmKindOptions}
                    />
                  </div>
                ) : null}
                <div>
                  <label htmlFor={`${genId}-difficulty`} className="block text-sm font-medium text-ink">
                    {copy.generate.difficulty}
                  </label>
                  <SelectMenu
                    id={`${genId}-difficulty`}
                    className="mt-1.5"
                    value={genDifficulty}
                    onChange={(value) => setGenDifficulty(value as ProblemDifficulty | 'any')}
                    options={[
                      {
                        value: 'any' as const,
                        label: copy.generate.anyDifficulty,
                      },
                      ...PROBLEM_DIFFICULTIES.map((difficulty) => ({
                        value: difficulty,
                        label: copy.difficulties[difficulty],
                      })),
                    ]}
                  />
                </div>
                <div>
                  <label htmlFor={`${genId}-year`} className="block text-sm font-medium text-ink">
                    {copy.generate.year}
                  </label>
                  <SelectMenu
                    id={`${genId}-year`}
                    className="mt-1.5"
                    value={genYear}
                    onChange={(value) => setGenYear(value as ProblemYear | 'any')}
                    options={[
                      { value: 'any' as const, label: copy.generate.anyYear },
                      ...PROBLEM_YEARS.map((year) => ({
                        value: year,
                        label: copy.years[year],
                      })),
                    ]}
                  />
                </div>
                <label className="block text-sm font-medium text-ink">
                  {copy.generate.count}
                  <input
                    className={`${fieldClass} mt-1.5`}
                    type="number"
                    min={1}
                    max={12}
                    value={genCount}
                    onChange={(event) => setGenCount(Math.min(12, Math.max(1, Number(event.target.value) || 1)))}
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={generating}
                    className="inline-flex h-[38px] w-full items-center justify-center rounded-xl bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-strong disabled:opacity-60">
                    {generating ? copy.generate.busy : copy.generate.submit}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label htmlFor={`${genId}-topic`} className="block text-sm font-medium text-ink">
                    {copy.generate.topic}
                  </label>
                  <SelectMenu
                    id={`${genId}-topic`}
                    className="mt-1.5"
                    value={genTopic}
                    onChange={(value) => selectGenTopic(value as ProblemTopic | 'any')}
                    options={[
                      { value: 'any' as const, label: copy.generate.anyTopic },
                      ...PROBLEM_TOPICS.map((topic) => ({
                        value: topic,
                        label: copy.topics[topic],
                      })),
                    ]}
                  />
                </div>
                <div>
                  <label htmlFor={`${genId}-difficulty`} className="block text-sm font-medium text-ink">
                    {copy.generate.difficulty}
                  </label>
                  <SelectMenu
                    id={`${genId}-difficulty`}
                    className="mt-1.5"
                    value={genDifficulty}
                    onChange={(value) => setGenDifficulty(value as ProblemDifficulty | 'any')}
                    options={[
                      {
                        value: 'any' as const,
                        label: copy.generate.anyDifficulty,
                      },
                      ...PROBLEM_DIFFICULTIES.map((difficulty) => ({
                        value: difficulty,
                        label: copy.difficulties[difficulty],
                      })),
                    ]}
                  />
                </div>
                <div>
                  <label htmlFor={`${genId}-year`} className="block text-sm font-medium text-ink">
                    {copy.generate.year}
                  </label>
                  <SelectMenu
                    id={`${genId}-year`}
                    className="mt-1.5"
                    value={genYear}
                    onChange={(value) => setGenYear(value as ProblemYear | 'any')}
                    options={[
                      { value: 'any' as const, label: copy.generate.anyYear },
                      ...PROBLEM_YEARS.map((year) => ({
                        value: year,
                        label: copy.years[year],
                      })),
                    ]}
                  />
                </div>
                <label className="block text-sm font-medium text-ink">
                  {copy.generate.count}
                  <input
                    className={`${fieldClass} mt-1.5`}
                    type="number"
                    min={1}
                    max={8}
                    value={genCount}
                    onChange={(event) => setGenCount(Math.min(8, Math.max(1, Number(event.target.value) || 1)))}
                  />
                </label>
                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    disabled={generating}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-strong disabled:opacity-60">
                    {generating ? copy.generate.busy : copy.generate.submit}
                  </button>
                </div>
              </div>
            )}
          </div>
          {draftIds.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving}
                className="inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-navy-strong disabled:opacity-60"
                onClick={() => void saveDraftsToBank()}>
                <Save className="size-4" aria-hidden="true" />
                {saving ? copy.generate.saving : copy.generate.saveToBank}
              </button>
              <button
                type="button"
                disabled={saving}
                className="text-sm font-medium text-navy hover:text-navy-strong disabled:opacity-60"
                onClick={() => void keepAllDrafts()}>
                {copy.generate.keepAll}
              </button>
            </div>
          ) : null}
        </form>
      ) : null}

      {panel === 'variants' ? (
        <form
          onSubmit={onVariants}
          className={`${panelClass} mt-6 space-y-4 bg-paper`}
          aria-labelledby="variants-heading">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-4">
            <h2 id="variants-heading" className="text-lg font-semibold tracking-tight text-ink">
              {copy.variantPanel.title}
            </h2>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-paper hover:text-navy"
              aria-label={copy.variantPanel.close}
              onClick={() => setPanel(null)}>
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          {selected ? (
            <div className="mt-4 rounded-xl bg-paper-deep px-4 py-3">
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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong">
              <Shuffle className="size-4" aria-hidden="true" />
              {copy.variantPanel.submit}
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-6 grid gap-5 xl:h-[calc(100vh-9rem)] xl:min-h-[36rem] xl:grid-cols-[16.5rem_minmax(0,1fr)_21rem] xl:items-stretch">
        <aside className="relative z-20 order-1 flex min-h-0 flex-col rounded-2xl border border-hairline bg-paper p-4 shadow-sm sm:p-5">
          <h2 className="shrink-0 border-b border-hairline pb-3 text-sm font-semibold tracking-wide text-brass">
            {copy.filtersTitle}
          </h2>
          <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pe-0.5">
            <label className="sr-only" htmlFor={searchId}>
              {copy.searchLabel}
            </label>
            <input
              id={searchId}
              className={fieldClass}
              type="search"
              value={filters.query}
              placeholder={copy.searchPlaceholder}
              onChange={(event) => updateFilter('query', event.target.value)}
            />

            <div className="space-y-2.5 border-t border-hairline-soft pt-3">
              <FilterSelect
                key="filter-branch"
                label={copy.branchFilter}
                value={filters.branchId}
                allLabel={copy.allBranches}
                options={branchOptions}
                labels={taxonomyLabels}
                onChange={(value) => updateTaxonomyFilter('branchId', value)}
              />
              <FilterSelect
                key="filter-topic"
                label={copy.topicFilter}
                value={filters.topicNodeId}
                allLabel={copy.allTopics}
                options={topicOptions}
                labels={taxonomyLabels}
                onChange={(value) => updateTaxonomyFilter('topicNodeId', value)}
              />
              <FilterSelect
                key="filter-subtopic"
                label={copy.subtopicFilter}
                value={filters.subtopicId}
                allLabel={copy.allSubtopics}
                options={subtopicOptions}
                labels={taxonomyLabels}
                onChange={(value) => updateTaxonomyFilter('subtopicId', value)}
              />
              <FilterSelect
                key="filter-concept"
                label={copy.conceptFilter}
                value={filters.conceptId}
                allLabel={copy.allConcepts}
                options={conceptOptions}
                labels={taxonomyLabels}
                onChange={(value) => updateTaxonomyFilter('conceptId', value)}
              />
            </div>

            <div className="space-y-2.5 border-t border-hairline-soft pt-3">
              <FilterSelect
                key="filter-difficulty"
                label={copy.generate.difficulty}
                value={filters.difficulty}
                allLabel={copy.allDifficulties}
                options={PROBLEM_DIFFICULTIES}
                labels={copy.difficulties}
                onChange={(value) => updateFilter('difficulty', value)}
              />
              <FilterSelect
                key="filter-year"
                label={copy.generate.year}
                value={filters.year}
                allLabel={copy.allYears}
                options={PROBLEM_YEARS}
                labels={copy.years}
                onChange={(value) => updateFilter('year', value)}
              />
              <FilterSelect
                key="filter-origin"
                label={copy.originFilter}
                value={filters.origin}
                allLabel={copy.allOrigins}
                options={PROBLEM_FILTER_ORIGINS}
                labels={copy.sources}
                onChange={(value) => updateFilter('origin', value)}
              />
            </div>
            <div className="border-t flex justify-center border-hairline-soft pt-3">
              <button
                type="button"
                className="mt-12 shrink-0 w-50 flex rounded-[15px] justify-center align-center  border border-navy/20 bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm hover:border-navy/40 hover:bg-navy-tint"
                onClick={() => setFilters(EMPTY_PROBLEM_FILTERS)}>
                {copy.resetFilters}
              </button>
            </div>
          </div>
        </aside>

        <section
          className={`${panelClass} order-3 flex min-h-[20rem] min-w-0 flex-col xl:order-2 xl:min-h-0`}
          aria-label={copy.listLabel}>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
            <p className="text-sm text-muted" aria-live="polite">
              {replaceCount(copy.results, visible.length)}
            </p>
            {bulkSelectMode && visible.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-body">
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
                    className="inline-flex items-center gap-1 rounded-lg bg-paper px-2 py-1 text-xs font-medium text-body hover:text-navy disabled:opacity-50"
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
                <button
                  type="button"
                  className="text-xs font-medium text-muted hover:text-navy"
                  onClick={exitBulkSelectMode}>
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
            <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pe-0.5">
              {visible.map((problem) => {
                const active = problem.id === selectedId;
                const inSet = lessonSetIds.includes(problem.id);
                const checked = selectedProblemIds.includes(problem.id);

                return (
                  <li
                    key={problem.id}
                    className={[
                      'relative select-none rounded-xl border transition-colors',
                      active
                        ? 'border-navy/20 bg-navy-tint/70'
                        : 'border-hairline-soft bg-white hover:border-hairline hover:bg-paper-deep/80',
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
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${difficultyTone[problem.difficulty]}`}>
                            {copy.difficulties[problem.difficulty]}
                          </span>
                          <span className="text-xs font-medium text-muted">
                            {problemBranchLabel(copy, problem, taxonomyTree, locale)}
                          </span>
                          {problem.year ? <span className="text-xs text-muted">{copy.years[problem.year]}</span> : null}
                          {problem.source !== 'bank' ? (
                            <span className="rounded-full bg-brass-tint px-2 py-0.5 text-[11px] font-semibold text-brass">
                              {sourceBadgeLabel(copy, problem)}
                            </span>
                          ) : null}
                          {inSet ? (
                            <span className="ml-auto text-[11px] font-semibold text-navy">{copy.inSet}</span>
                          ) : null}
                          {showSaveToLab && labIds.includes(problem.id) ? (
                            <span
                              className={[
                                'rounded-full bg-brass-tint px-2 py-0.5 text-[11px] font-semibold text-brass',
                                inSet ? '' : 'ml-auto',
                              ].join(' ')}>
                              {copy.stats.inLab}
                            </span>
                          ) : null}
                          {!showSaveToLab && !isUnsavedId(problem.id) && !isCatalogSeedId(problem.id) ? (
                            <span
                              className={[
                                'rounded-full bg-navy-tint px-2 py-0.5 text-[11px] font-semibold text-navy',
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
              })}
            </ul>
          )}
        </section>

        <section
          className="order-2 flex min-h-0 min-w-0 flex-col rounded-2xl border border-navy/10 bg-navy-tint/25 p-4 shadow-sm sm:p-5 xl:order-3"
          aria-label={copy.previewLabel}>
          {selected ? (
            <>
              <p className="shrink-0 border-b border-navy/10 pb-3 text-sm font-semibold tracking-wide text-brass">
                {copy.prompt}
              </p>
              <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto pe-0.5">
                <div className="group relative min-w-0 overflow-x-auto rounded-xl bg-paper-deep px-4 py-5 pe-12">
                  <KatexPreview tex={selected.promptTex} displayMode className="block min-w-0 text-ink" />
                  <CopyPromptButton
                    text={selected.promptTex}
                    copyLabel={copy.copyPrompt}
                    copiedLabel={copy.copiedPrompt}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted">
                  <span>{problemBranchLabel(copy, selected, taxonomyTree, locale)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{copy.difficulties[selected.difficulty]}</span>
                  {selected.year ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{copy.years[selected.year]}</span>
                    </>
                  ) : null}
                  {showSaveToLab && labIds.includes(selected.id) ? (
                    <span className="rounded-full bg-brass-tint px-2 py-0.5 text-[11px] font-semibold text-brass">
                      {copy.stats.inLab}
                    </span>
                  ) : null}
                  {!showSaveToLab && !isUnsavedId(selected.id) && !isCatalogSeedId(selected.id) ? (
                    <span className="rounded-full bg-navy-tint px-2 py-0.5 text-[11px] font-semibold text-navy">
                      {copy.stats.inBank}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 border-t border-navy/10 pt-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-navy-strong"
                    onClick={() => setShowSolution((value) => !value)}>
                    {showSolution ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                    {showSolution ? copy.hideSolution : copy.showSolution}
                  </button>
                  {showSolution ? (
                    <>
                      <div className="mt-3 max-h-64 overflow-y-auto overflow-x-auto rounded-xl border border-hairline bg-white px-4 py-4 sm:max-h-80">
                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted">{copy.solution}</p>
                        <KatexPreview
                          tex={selected.solutionTex}
                          className="block whitespace-pre-wrap break-words text-ink [&_.katex-display]:my-2 [&_.katex]:text-[1.05rem]"
                        />
                      </div>
                      <button
                        type="button"
                        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-navy-strong"
                        onClick={() => setFullSolutionOpen(true)}>
                        <Expand className="size-4" aria-hidden="true" />
                        {copy.fullSolution.open}
                      </button>
                    </>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-col gap-2 border-t border-navy/10 pt-4">
                  <button
                    type="button"
                    className={
                      lessonSetIds.includes(selected.id)
                        ? 'inline-flex items-center justify-center gap-2 rounded-xl border border-navy/30 bg-navy-tint px-4 py-2.5 text-sm font-semibold text-navy'
                        : 'inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong'
                    }
                    onClick={() => void toggleInSet(selected.id)}>
                    {lessonSetIds.includes(selected.id) ? (
                      <>
                        <X className="size-4" aria-hidden="true" />
                        {copy.removeFromSet}
                      </>
                    ) : (
                      <>
                        <Plus className="size-4" aria-hidden="true" />
                        {copy.addToSet}
                      </>
                    )}
                  </button>
                  {isUnsavedId(selected.id) && selected.source !== 'bank' ? (
                    <button
                      type="button"
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy/30 bg-navy-tint px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
                      onClick={() => {
                        void (async () => {
                          setSaving(true);
                          try {
                            await saveProblems([selected]);
                          } finally {
                            setSaving(false);
                          }
                        })();
                      }}>
                      <Save className="size-4" aria-hidden="true" />
                      {saving ? copy.generate.saving : copy.generate.saveToBank}
                    </button>
                  ) : null}
                  {showGenerateVariants && canVary(selected, templateJsonForProblem(selected, families)) ? (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy/20 bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm hover:border-navy/40 hover:bg-navy-tint"
                      onClick={() => {
                        setPanel('variants');
                        setNotice(null);
                      }}>
                      <Shuffle className="size-4" aria-hidden="true" />
                      {copy.variantPanel.submit}
                    </button>
                  ) : null}
                  {showSendToLab ? (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy/20 bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm hover:border-navy/40 hover:bg-navy-tint"
                      onClick={() => {
                        stashProblemForLab(selected);
                        router.push(localePath(locale, '/teacher/lab'));
                      }}>
                      <FlaskConical className="size-4" aria-hidden="true" />
                      {copy.actions.sendToLab}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy/20 bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm hover:border-navy/40 hover:bg-navy-tint"
                    onClick={() => {
                      const family = copy.importFamily;
                      const result = checkBankProblem(selected, templateJsonForProblem(selected, families));
                      if (result.ok) {
                        setCasOk(true);
                        setCasNotice(
                          replaceTokens(family.checkCasOk, {
                            value: result.value,
                          }),
                        );
                        return;
                      }
                      setCasOk(false);
                      if (result.reason === 'no_formula') {
                        setCasNotice(family.checkCasNoFormula);
                        return;
                      }
                      if (result.reason === 'mismatch') {
                        setCasNotice(
                          replaceTokens(family.checkCasMismatch, {
                            got: result.got ?? '',
                            expected: result.expected ?? '',
                          }),
                        );
                        return;
                      }
                      setCasNotice(family.checkCasFail);
                    }}>
                    <Calculator className="size-4" aria-hidden="true" />
                    {copy.importFamily.checkCas}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy/20 bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm hover:border-navy/40 hover:bg-navy-tint"
                    onClick={() => void discardProblem(selected.id)}>
                    <Trash2 className="size-4" aria-hidden="true" />
                    {selected.source === 'bank' ? copy.generate.remove : copy.generate.discard}
                  </button>
                  {casNotice ? (
                    <p className={casOk ? 'text-sm text-navy' : 'text-sm text-brass-strong'}>{casNotice}</p>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <p className="flex flex-1 items-center text-sm leading-relaxed text-body">{copy.previewEmpty}</p>
          )}
        </section>
      </div>

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

      <section className={`${panelClass} mt-6`} aria-label={copy.lessonSet}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            {copy.lessonSet}
            <span className="ml-2 text-sm font-medium text-muted">{replaceCount(copy.results, lessonSet.length)}</span>
          </h2>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            {lessonSet.length > 0 ? (
              <button
                type="button"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-full border border-hairline px-3 py-2.5 text-sm font-medium text-body hover:border-navy/30 hover:text-navy disabled:opacity-60 sm:py-1.5"
                onClick={() => {
                  void (async () => {
                    setSaving(true);
                    try {
                      await persistLessonSet([]);
                    } finally {
                      setSaving(false);
                    }
                  })();
                }}>
                {copy.clearSet}
              </button>
            ) : null}
            <Link
              href={localePath(locale, '/teacher/problems')}
              className="inline-flex items-center justify-center rounded-full bg-navy px-3 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong sm:py-1.5">
              {copy.actions.openLab}
            </Link>
            <Link
              href={localePath(locale, '/teacher/homework')}
              className="inline-flex items-center justify-center rounded-full border border-hairline bg-white px-3 py-2.5 text-sm font-medium text-body hover:border-navy/30 hover:text-navy sm:py-1.5">
              {copy.actions.openHomework}
            </Link>
          </div>
        </div>
        {lessonSet.length === 0 ? (
          <p className="mt-3 text-sm text-body">{copy.lessonSetEmpty}</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {lessonSet.map((problem, index) => (
              <li
                key={problem.id}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-hairline bg-paper py-1 pr-1 pl-3 text-sm text-ink">
                <button
                  type="button"
                  className="inline-flex min-w-0 max-w-[min(100%,16rem)] items-center gap-2 overflow-hidden hover:text-navy sm:max-w-[18rem]"
                  onClick={() => setSelectedId(problem.id)}>
                  <span className="shrink-0 font-semibold text-navy">{index + 1}</span>
                  <span className="min-w-0 overflow-x-auto">
                    <KatexPreview tex={problem.promptTex} className="whitespace-nowrap [&_.katex]:text-[0.9rem]" />
                  </span>
                </button>
                <button
                  type="button"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-white hover:text-navy"
                  aria-label={copy.removeFromSet}
                  onClick={() => void toggleInSet(problem.id)}>
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
