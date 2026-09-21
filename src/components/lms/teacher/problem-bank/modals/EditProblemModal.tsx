'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { PenLine, X } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import { SelectMenu } from '@/components/ui/SelectMenu';
import type { Locale } from '@/i18n/config';
import { handlePlainTextPaste } from '@/lib/helpers/plain-text-paste';
import {
  PROBLEM_DIFFICULTIES,
  PROBLEM_SOURCES,
  PROBLEM_YEARS,
  type BankProblem,
  type ProblemBankCopy,
  type ProblemDifficulty,
  type ProblemYear,
} from '@/lib/math/problems';
import { loadTaxonomyAction } from '@/lib/math/problems/actions';
import { childrenOf, taxonomyLabel, type TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';
import { toKatexFriendlyTex } from '@/lib/math/problems/tex';

const fieldClass =
  'w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15';

const EDIT_SOURCES = ['custom', 'verified', 'unchecked', 'ai', 'generated', 'bank'] as const;

type EditSource = (typeof EDIT_SOURCES)[number];

type TaxonomySelection = {
  branchId: string | 'all';
  topicNodeId: string | 'all';
  subtopicId: string | 'all';
  conceptId: string | 'all';
};

interface EditProblemModalProps {
  locale: Locale;
  copy: ProblemBankCopy;
  problem: BankProblem;
  taxonomyNodes: TaxonomyNodeDto[];
  onTaxonomyChange?: (nodes: TaxonomyNodeDto[]) => void;
  onClose: () => void;
  onSave: (problem: BankProblem) => Promise<boolean>;
}

function MathFieldPreview({ label, tex }: { label: string; tex: string }) {
  if (!tex.trim()) return null;
  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-hairline-soft bg-paper px-3 py-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <KatexPreview
        tex={toKatexFriendlyTex(tex)}
        className="block min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink [&_.katex-display]:my-2 [&_.katex]:text-[1.05rem]"
      />
    </div>
  );
}

function sourceFromProblem(problem: BankProblem): EditSource {
  if (problem.templateId === 'ai-verified') return 'verified';
  if (problem.templateId === 'ai-plain') return 'unchecked';
  if ((PROBLEM_SOURCES as readonly string[]).includes(problem.source)) {
    return problem.source as EditSource;
  }
  return 'unchecked';
}

function applySource(problem: BankProblem, next: EditSource): Pick<BankProblem, 'source' | 'templateId'> {
  if (next === 'verified') {
    return {
      source: problem.source === 'bank' || problem.source === 'custom' ? 'ai' : problem.source,
      templateId: 'ai-verified',
    };
  }

  if (next === 'unchecked') {
    return {
      source: problem.source === 'bank' || problem.source === 'custom' ? 'ai' : problem.source,
      templateId: 'ai-plain',
    };
  }

  if (next === 'custom') {
    return { source: 'custom', templateId: 'custom' };
  }

  if (next === 'ai') {
    return { source: 'ai', templateId: 'ai' };
  }

  if (next === 'generated') {
    return {
      source: 'generated',
      templateId:
        problem.templateId === 'ai-plain' || problem.templateId === 'ai-verified' ? 'generated' : problem.templateId,
    };
  }

  return {
    source: 'bank',
    templateId: problem.templateId === 'ai-plain' || problem.templateId === 'ai-verified' ? 'bank' : problem.templateId,
  };
}

function initialTaxonomy(problem: BankProblem, nodes: TaxonomyNodeDto[]): TaxonomySelection {
  const byId = new Map(nodes.map((node) => [node.id, node]));

  let branchId = problem.branchId && byId.has(problem.branchId) ? problem.branchId : ('all' as const);
  let topicNodeId = problem.topicNodeId && byId.has(problem.topicNodeId) ? problem.topicNodeId : ('all' as const);
  let subtopicId = problem.subtopicId && byId.has(problem.subtopicId) ? problem.subtopicId : ('all' as const);
  let conceptId = problem.conceptId && byId.has(problem.conceptId) ? problem.conceptId : ('all' as const);

  // Infer from stored FKs upward when only a deeper id is set.
  if (conceptId !== 'all') {
    const concept = byId.get(conceptId);
    if (concept?.parentId) subtopicId = concept.parentId;
  }
  if (subtopicId !== 'all') {
    const subtopic = byId.get(subtopicId);
    if (subtopic?.parentId) topicNodeId = subtopic.parentId;
  }
  if (topicNodeId !== 'all') {
    const topic = byId.get(topicNodeId);
    if (topic?.parentId) branchId = topic.parentId;
  }

  // Legacy string topic → taxonomy topic node (by slug).
  if (topicNodeId === 'all' && problem.topic) {
    const match = nodes.find((node) => node.level === 'topic' && node.slug === problem.topic);
    if (match) {
      topicNodeId = match.id;
      if (match.parentId) branchId = match.parentId;
    }
  }

  return { branchId, topicNodeId, subtopicId, conceptId };
}

function TaxonomySelect({
  id,
  label,
  value,
  allLabel,
  options,
  labels,
  onChange,
}: {
  id: string;
  label: string;
  value: string | 'all';
  allLabel: string;
  options: readonly string[];
  labels: Record<string, string>;
  onChange: (value: string | 'all') => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink" htmlFor={id}>
        {label}
      </label>
      <SelectMenu
        id={id}
        className="mt-1.5"
        value={value}
        onChange={onChange}
        options={[
          { value: 'all' as const, label: allLabel },
          ...options.map((option) => ({
            value: option,
            label: labels[option] ?? option,
          })),
        ]}
      />
    </div>
  );
}

export function EditProblemModal({
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

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // Pull latest curriculum tree whenever the modal opens.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const fresh = await loadTaxonomyAction();
      if (cancelled) return;
      setNodes(fresh);
      onTaxonomyChange?.(fresh);
      setTaxonomy((current) => {
        const next = initialTaxonomy(
          {
            ...problem,
            branchId: current.branchId === 'all' ? undefined : current.branchId,
            topicNodeId: current.topicNodeId === 'all' ? undefined : current.topicNodeId,
            subtopicId: current.subtopicId === 'all' ? undefined : current.subtopicId,
            conceptId: current.conceptId === 'all' ? undefined : current.conceptId,
          },
          fresh,
        );
        // Prefer live selection if still present; otherwise re-init from problem.
        const ids = new Set(fresh.map((node) => node.id));
        return {
          branchId: current.branchId !== 'all' && ids.has(current.branchId) ? current.branchId : next.branchId,
          topicNodeId:
            current.topicNodeId !== 'all' && ids.has(current.topicNodeId) ? current.topicNodeId : next.topicNodeId,
          subtopicId:
            current.subtopicId !== 'all' && ids.has(current.subtopicId) ? current.subtopicId : next.subtopicId,
          conceptId: current.conceptId !== 'all' && ids.has(current.conceptId) ? current.conceptId : next.conceptId,
        };
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [problem, onTaxonomyChange]);

  useEffect(() => {
    setNodes(taxonomyNodes);
  }, [taxonomyNodes]);

  const taxonomyLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const node of nodes) {
      labels[node.id] = taxonomyLabel(node, locale);
    }
    return labels;
  }, [nodes, locale]);

  const branchOptions = useMemo(() => childrenOf(nodes, null, 'branch').map((n) => n.id), [nodes]);

  const topicOptions = useMemo(() => {
    if (taxonomy.branchId === 'all') {
      return nodes.filter((n) => n.level === 'topic').map((n) => n.id);
    }
    return childrenOf(nodes, taxonomy.branchId, 'topic').map((n) => n.id);
  }, [nodes, taxonomy.branchId]);

  const subtopicOptions = useMemo(() => {
    if (taxonomy.topicNodeId === 'all') return [] as string[];
    return childrenOf(nodes, taxonomy.topicNodeId, 'subtopic').map((n) => n.id);
  }, [nodes, taxonomy.topicNodeId]);

  const conceptOptions = useMemo(() => {
    if (taxonomy.subtopicId === 'all') return [] as string[];
    return childrenOf(nodes, taxonomy.subtopicId, 'concept').map((n) => n.id);
  }, [nodes, taxonomy.subtopicId]);

  function updateTaxonomy(key: keyof TaxonomySelection, value: string | 'all') {
    setTaxonomy((current) => {
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

    const topicNode =
      taxonomy.topicNodeId !== 'all' ? nodes.find((node) => node.id === taxonomy.topicNodeId) : undefined;

    const sourced = applySource(problem, source);
    const next: BankProblem = {
      ...problem,
      ...sourced,
      topic: topicNode?.slug || problem.topic,
      difficulty,
      promptTex,
      solutionTex,
      branchId: taxonomy.branchId === 'all' ? undefined : taxonomy.branchId,
      topicNodeId: taxonomy.topicNodeId === 'all' ? undefined : taxonomy.topicNodeId,
      subtopicId: taxonomy.subtopicId === 'all' ? undefined : taxonomy.subtopicId,
      conceptId: taxonomy.conceptId === 'all' ? undefined : taxonomy.conceptId,
    };
    if (year) next.year = year;
    else delete next.year;

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

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <button
        type="button"
        className="absolute inset-0 bg-navy-strong/40 backdrop-blur-sm"
        aria-label={ui.close}
        onClick={onClose}
      />
      <div className="pointer-events-none relative z-10 flex h-full items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="pointer-events-auto flex max-h-full w-full max-w-2xl min-h-0 flex-col overflow-hidden rounded-2xl border border-hairline bg-white shadow-lg shadow-navy/10">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-5">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
              {ui.title}
            </h2>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-paper hover:text-navy"
              aria-label={ui.close}
              onClick={onClose}>
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-ink" htmlFor={`${titleId}-difficulty`}>
                  {ui.difficulty}
                </label>
                <SelectMenu
                  id={`${titleId}-difficulty`}
                  className="mt-1.5"
                  value={difficulty}
                  onChange={(value) => setDifficulty(value as ProblemDifficulty)}
                  options={PROBLEM_DIFFICULTIES.map((id) => ({
                    value: id,
                    label: copy.difficulties[id],
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink" htmlFor={`${titleId}-year`}>
                  {ui.year}
                </label>
                <SelectMenu
                  id={`${titleId}-year`}
                  className="mt-1.5"
                  value={year}
                  onChange={(value) => setYear(value === '' ? '' : (value as ProblemYear))}
                  options={[
                    { value: '' as const, label: ui.noYear },
                    ...PROBLEM_YEARS.map((id) => ({
                      value: id,
                      label: copy.years[id],
                    })),
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink" htmlFor={`${titleId}-source`}>
                  {ui.source}
                </label>
                <SelectMenu
                  id={`${titleId}-source`}
                  className="mt-1.5"
                  value={source}
                  onChange={(value) => setSource(value as EditSource)}
                  options={EDIT_SOURCES.map((id) => ({
                    value: id,
                    label: copy.sources[id],
                  }))}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <TaxonomySelect
                id={`${titleId}-branch`}
                label={copy.branchFilter}
                value={taxonomy.branchId}
                allLabel={copy.allBranches}
                options={branchOptions}
                labels={taxonomyLabels}
                onChange={(value) => updateTaxonomy('branchId', value)}
              />
              <TaxonomySelect
                id={`${titleId}-topic`}
                label={copy.topicFilter}
                value={taxonomy.topicNodeId}
                allLabel={copy.allTopics}
                options={topicOptions}
                labels={taxonomyLabels}
                onChange={(value) => updateTaxonomy('topicNodeId', value)}
              />
              <TaxonomySelect
                id={`${titleId}-subtopic`}
                label={copy.subtopicFilter}
                value={taxonomy.subtopicId}
                allLabel={copy.allSubtopics}
                options={subtopicOptions}
                labels={taxonomyLabels}
                onChange={(value) => updateTaxonomy('subtopicId', value)}
              />
              <TaxonomySelect
                id={`${titleId}-concept`}
                label={copy.conceptFilter}
                value={taxonomy.conceptId}
                allLabel={copy.allConcepts}
                options={conceptOptions}
                labels={taxonomyLabels}
                onChange={(value) => updateTaxonomy('conceptId', value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink" htmlFor={`${titleId}-prompt`}>
                {ui.promptLabel}
              </label>
              <textarea
                id={`${titleId}-prompt`}
                className={`${fieldClass} mt-1.5 min-h-[8rem] resize-y font-sans`}
                value={prompt}
                maxLength={4000}
                placeholder={ui.promptPlaceholder}
                onChange={(event) => setPrompt(event.target.value)}
                onPaste={(event) => handlePlainTextPaste(event, prompt, setPrompt, 4000, 'katex')}
              />
            </div>
            <MathFieldPreview label={ui.previewLabel} tex={prompt} />

            <div>
              <label className="block text-sm font-medium text-ink" htmlFor={`${titleId}-solution`}>
                {ui.solutionLabel}
              </label>
              <textarea
                id={`${titleId}-solution`}
                className={`${fieldClass} mt-1.5 min-h-[8rem] resize-y font-sans`}
                value={solution}
                maxLength={12000}
                placeholder={ui.solutionPlaceholder}
                onChange={(event) => setSolution(event.target.value)}
                onPaste={(event) => handlePlainTextPaste(event, solution, setSolution, 12000, 'katex')}
              />
            </div>
            <MathFieldPreview label={ui.previewLabel} tex={solution} />
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-hairline px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:px-5">
            {notice ? <p className="w-full text-sm text-brass-strong sm:me-auto sm:w-auto">{notice}</p> : null}
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-xl border border-hairline bg-white px-4 py-2.5 text-sm font-medium text-body hover:border-navy/30 hover:text-navy sm:w-auto"
              onClick={onClose}>
              {ui.cancel}
            </button>
            <button
              type="button"
              disabled={busy || !prompt.trim() || !solution.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-strong disabled:opacity-60 sm:w-auto"
              onClick={() => void onSubmit()}>
              <PenLine className="size-4" aria-hidden="true" />
              {busy ? ui.saving : ui.save}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
