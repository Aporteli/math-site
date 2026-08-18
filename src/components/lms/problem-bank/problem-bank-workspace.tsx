"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Copy, Eye, EyeOff, Library, Plus, Save, Shuffle, Trash2, X } from "lucide-react";
import { KatexPreview } from "@/components/math/katex-preview";
import { PageHero } from "@/components/ui/page-hero";
import { SelectMenu } from "@/components/ui/select-menu";
import { localePath, type Locale } from "@/i18n/config";
import {
  generateDiverseProblemsAction,
  deleteProblemAction,
  loadAiModelStatusAction,
  loadTeacherBankAction,
  saveProblemsAction,
  syncLessonSetAction,
} from "@/lib/math/problems/actions";
import {
  EMPTY_PROBLEM_FILTERS,
  PROBLEM_BANK_TOOLS,
  PROBLEM_CHECKS,
  PROBLEM_DIFFICULTIES,
  PROBLEM_SOURCES,
  PROBLEM_TOPICS,
  PROBLEM_YEARS,
  AI_MODEL_IDS,
  DEFAULT_AI_MODEL,
  filterProblems,
  generateDiverseProblemsSchema,
  generateProblems,
  generateProblemsSchema,
  generateVariants,
  canVary,
  isCatalogSeedId,
  isUnsavedId,
  toPersistInput,
  replaceCount,
  replaceTokens,
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
} from "@/lib/math/problems";

const fieldClass =
  "w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15";

const panelClass = "rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5";

function sourceBadgeLabel(copy: ProblemBankCopy, problem: BankProblem) {
  if (problem.templateId === "ai-plain") return copy.sources.unchecked;
  if (problem.templateId === "ai-verified") return copy.sources.verified;
  return copy.sources[problem.source];
}

type GenerateCopy = ProblemBankCopy["generate"];

function walletAmount(copy: GenerateCopy, wallet: AiModelStatus["wallet"]) {
  if (wallet.balance && wallet.currency) {
    return replaceTokens(copy.walletAmount, {
      amount: wallet.balance,
      currency: wallet.currency,
    });
  }
  return "";
}

function walletChipLabel(copy: GenerateCopy, wallet: AiModelStatus["wallet"]) {
  switch (wallet.state) {
    case "missing_key":
      return copy.limitNoKey;
    case "invalid_key":
      return copy.walletInvalid;
    case "needs_billing":
      return copy.walletNeedsBilling;
    case "ready": {
      const amount = walletAmount(copy, wallet);
      if (amount) return amount;
      return wallet.kind === "free" ? copy.walletFree : copy.walletReady;
    }
    default:
      return wallet.kind === "free" ? copy.walletFree : copy.walletUnknown;
  }
}

function walletHint(copy: GenerateCopy, wallet: AiModelStatus["wallet"]) {
  switch (wallet.state) {
    case "missing_key":
      return copy.walletHintMissing;
    case "invalid_key":
      return copy.walletHintInvalid;
    case "needs_billing":
      return copy.walletHintNeedsBilling;
    case "ready": {
      if (wallet.kind === "free") return copy.walletHintReadyFree;
      const detail = walletAmount(copy, wallet) || copy.walletReady;
      return replaceTokens(copy.walletHintReadyPaid, { detail });
    }
    default:
      return wallet.kind === "free"
        ? copy.walletHintReadyFree
        : copy.walletHintUnknown;
  }
}

function walletTone(wallet: AiModelStatus["wallet"], selected: boolean) {
  if (wallet.state === "needs_billing" || wallet.state === "invalid_key") {
    return "border-brass/20 bg-brass-tint/40 text-brass-strong";
  }
  if (wallet.state === "missing_key") {
    return "border-hairline bg-white text-muted";
  }
  if (selected) return "border-navy/20 bg-navy-tint text-navy";
  return "border-hairline bg-white text-body";
}

function uniqueProviders(status: AiModelStatus[]) {
  const seen = new Set<string>();
  return status.filter((item) => {
    if (seen.has(item.provider)) return false;
    seen.add(item.provider);
    return true;
  });
}

const difficultyTone: Record<ProblemDifficulty, string> = {
  easy: "bg-navy-tint text-navy",
  medium: "bg-brass-tint text-brass",
  hard: "border border-hairline bg-paper-deep text-brass-strong",
};

interface ProblemBankWorkspaceProps {
  locale: Locale;
  title: string;
  subtitle: string;
  copy: ProblemBankCopy;
  initialBank: BankProblem[];
  initialLessonSetIds: string[];
}

export function ProblemBankWorkspace({
  locale,
  title,
  subtitle,
  copy,
  initialBank,
  initialLessonSetIds,
}: ProblemBankWorkspaceProps) {
  const searchId = useId();
  const genId = useId();
  const [bank, setBank] = useState<BankProblem[]>(initialBank);
  const [filters, setFilters] = useState<ProblemFilters>(EMPTY_PROBLEM_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialBank[0]?.id ?? null,
  );
  const [lessonSetIds, setLessonSetIds] = useState<string[]>(initialLessonSetIds);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [showSolution, setShowSolution] = useState(false);
  const [panel, setPanel] = useState<"generate" | "variants" | null>("generate");
  const [notice, setNotice] = useState<string | null>(null);
  const [genTopic, setGenTopic] = useState<ProblemTopic | "any">("any");
  const [genDifficulty, setGenDifficulty] = useState<ProblemDifficulty | "any">(
    "any",
  );
  const [genYear, setGenYear] = useState<ProblemYear | "any">("any");
  const [genCount, setGenCount] = useState(5);
  const [genMode, setGenMode] = useState<"templates" | "diverse">("diverse");
  const [genCheck, setGenCheck] = useState<AiCheckMode>("verified");
  const [genModel, setGenModel] = useState<AiModelId>(DEFAULT_AI_MODEL);
  const [modelStatus, setModelStatus] = useState<AiModelStatus[]>([]);
  const [genRequest, setGenRequest] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [variantCount, setVariantCount] = useState(5);

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
  }, [initialBank]);

  const visible = filterProblems(bank, filters);
  const selected = bank.find((problem) => problem.id === selectedId) ?? null;
  const selectedModelStatus = modelStatus.find(
    (status) => status.id === genModel,
  );
  const lessonSet = lessonSetIds
    .map((id) => bank.find((problem) => problem.id === id))
    .filter((problem): problem is BankProblem => Boolean(problem));
  const generatedCount = bank.filter(
    (problem) => problem.source === "generated" || problem.source === "ai",
  ).length;

  function updateFilter<K extends keyof ProblemFilters>(
    key: K,
    value: ProblemFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function remapIds(ids: string[], idMap: Record<string, string>) {
    return ids.map((id) => idMap[id] ?? id);
  }

  function mergeSaved(
    current: BankProblem[],
    saved: BankProblem[],
    idMap: Record<string, string>,
  ) {
    const replaced = new Set(Object.keys(idMap));
    const savedIds = new Set(saved.map((problem) => problem.id));
    const rest = current.filter(
      (problem) => !replaced.has(problem.id) && !savedIds.has(problem.id),
    );
    return [...saved, ...rest];
  }

  function persistErrorMessage(error: "unauthorized" | "failed") {
    return error === "unauthorized"
      ? copy.generate.errorUnauthorized
      : copy.generate.saveFailed;
  }

  async function saveProblems(problems: BankProblem[]) {
    if (problems.length === 0) return null;
    let payload;
    try {
      payload = problems.map((problem) => toPersistInput(problem));
    } catch {
      setNotice(copy.generate.saveFailed);
      return null;
    }
    const result = await saveProblemsAction(payload);
    if (!result.ok) {
      setNotice(persistErrorMessage(result.error));
      return null;
    }
    setBank((current) => mergeSaved(current, result.saved, result.idMap));
    setDraftIds((current) =>
      remapIds(
        current.filter((id) => !problems.some((problem) => problem.id === id)),
        result.idMap,
      ),
    );
    setSelectedId((current) =>
      current ? (result.idMap[current] ?? current) : current,
    );
    setLessonSetIds((current) => remapIds(current, result.idMap));
    setNotice(
      replaceTokens(copy.generate.saved, { count: result.saved.length }),
    );
    return result;
  }

  async function persistLessonSet(nextIds: string[]) {
    const members = nextIds
      .map((id) => bank.find((problem) => problem.id === id))
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
    setDraftIds((current) => remapIds(current, result.idMap));
    setSelectedId((current) =>
      current ? (result.idMap[current] ?? current) : current,
    );
    setLessonSetIds(result.lessonSetIds);
  }

  async function toggleInSet(id: string) {
    const next = lessonSetIds.includes(id)
      ? lessonSetIds.filter((item) => item !== id)
      : [...lessonSetIds, id];
    setSaving(true);
    try {
      await persistLessonSet(next);
    } finally {
      setSaving(false);
    }
  }

  async function discardProblem(id: string) {
    if (!isUnsavedId(id)) {
      setSaving(true);
      const result = await deleteProblemAction(id);
      setSaving(false);
      if (!result.ok) {
        setNotice(persistErrorMessage(result.error));
        return;
      }
    }

    const nextSet = lessonSetIds.filter((item) => item !== id);
    setBank((current) => current.filter((problem) => problem.id !== id));
    setLessonSetIds(nextSet);
    setDraftIds((current) => current.filter((item) => item !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setShowSolution(false);
    }
    if (!isUnsavedId(id)) {
      setSaving(true);
      try {
        await persistLessonSet(nextSet);
      } finally {
        setSaving(false);
      }
    }
  }

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
    setDraftIds(created.map((problem) => problem.id));
    setSelectedId(created[0]?.id ?? null);
    setShowSolution(false);
    setFilters({
      query: "",
      topic:
        created.every((problem) => problem.topic === created[0]?.topic)
          ? (created[0]?.topic ?? "all")
          : "all",
      difficulty: "all",
      year: "all",
      source: created[0]?.source ?? "all",
      check: created.every((problem) => problem.templateId === "ai-plain")
        ? "unchecked"
        : created.every((problem) => problem.templateId === "ai-verified")
          ? "verified"
          : "all",
    });
  }

  async function onGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (genMode === "templates") {
      if (genTopic === "any" || genDifficulty === "any" || genYear === "any") {
        return;
      }
      const parsed = generateProblemsSchema.safeParse({
        topic: genTopic,
        difficulty: genDifficulty,
        year: genYear,
        count: genCount,
      });
      if (!parsed.success) return;
      applyCreated(generateProblems(parsed.data));
      setNotice(null);
      return;
    }

    const parsed = generateDiverseProblemsSchema.safeParse({
      request: genRequest,
      topic: genTopic === "any" ? undefined : genTopic,
      difficulty: genDifficulty === "any" ? undefined : genDifficulty,
      year: genYear === "any" ? undefined : genYear,
      count: Math.min(8, genCount),
      locale,
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
    if (!canVary(selected)) {
      setNotice(copy.variantPanel.needFormula);
      return;
    }

    const created = generateVariants(selected, variantCount);
    if (created.length === 0) {
      setNotice(copy.variantPanel.noneVerified);
      return;
    }

    applyCreated(created);
    setNotice(null);
  }

  function onTool(id: ProblemBankToolId) {
    const tool = PROBLEM_BANK_TOOLS.find((item) => item.id === id);
    if (!tool) return;

    if (id === "generate" || id === "variants") {
      setPanel((current) => (current === id ? null : id));
      setNotice(null);
      return;
    }

    if (tool.status === "soon") {
      setNotice(copy.tools[id].hint);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHero
        icon={Library}
        eyebrow={copy.eyebrow}
        title={title}
        description={subtitle}
        aside={
          <>
            <Stat label={copy.stats.inBank} value={bank.length} />
            <Stat label={copy.stats.selected} value={lessonSet.length} />
            <Stat label={copy.stats.generated} value={generatedCount} />
          </>
        }
      />

      <section className="mt-6" aria-label={copy.tools.label}>
        <p className="mb-3 text-sm font-semibold tracking-wide text-brass">
          {copy.tools.label}
        </p>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {PROBLEM_BANK_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const item = copy.tools[tool.id];
            const className = [
              "flex h-full w-full flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition-all",
              tool.status === "ready" && panel === tool.id
                ? "border-navy/30 bg-navy-tint shadow-sm"
                : "border-hairline bg-white shadow-sm hover:border-navy/30 hover:shadow-md",
            ].join(" ");

            const body = (
              <>
                <span className="flex items-start gap-2">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy-tint text-navy">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 text-sm font-semibold text-ink">
                    {item.title}
                  </span>
                  {tool.status === "soon" ? (
                    <span className="ml-auto shrink-0 rounded-full bg-brass-tint px-2 py-0.5 text-[10px] font-semibold tracking-wide text-brass">
                      {copy.soon}
                    </span>
                  ) : null}
                </span>
                <span className="flex-1 text-xs leading-relaxed text-muted">
                  {item.hint}
                </span>
              </>
            );

            return (
              <li key={tool.id} className="h-full">
                {tool.status === "link" && tool.href ? (
                  <Link href={localePath(locale, tool.href)} className={className}>
                    {body}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={className}
                    aria-pressed={
                      tool.id === "generate" || tool.id === "variants"
                        ? panel === tool.id
                        : undefined
                    }
                    onClick={() => onTool(tool.id)}
                  >
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {notice ? (
          <p className="mt-3 rounded-xl border border-brass/20 bg-brass-tint px-4 py-3 text-sm text-brass-strong">
            {notice}
          </p>
        ) : null}
      </section>

      {panel === "generate" ? (
        <form
          onSubmit={onGenerate}
          className={`${panelClass} mt-6 space-y-4`}
          aria-labelledby="generate-heading"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                id="generate-heading"
                className="text-lg font-semibold tracking-tight text-ink"
              >
                {copy.generate.title}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-body">
                {genMode === "diverse"
                  ? genCheck === "plain"
                    ? copy.generate.plainHint
                    : copy.generate.requestHint
                  : copy.generate.batchHint}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-paper hover:text-navy"
              aria-label={copy.generate.close}
              onClick={() => setPanel(null)}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="rounded-2xl border border-navy/8 bg-navy-tint/35 p-3">
            <div
              className="inline-flex rounded-xl border border-navy/15 bg-white/80 p-1"
              role="group"
              aria-label={copy.generate.mode}
            >
              <button
                type="button"
                className={[
                  "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                  genMode === "templates"
                    ? "bg-white text-navy shadow-sm"
                    : "text-body hover:text-navy",
                ].join(" ")}
                aria-pressed={genMode === "templates"}
                onClick={() => {
                  setGenMode("templates");
                  if (genTopic === "any") setGenTopic("algebra");
                  if (genDifficulty === "any") setGenDifficulty("medium");
                  if (genYear === "any") setGenYear("9");
                }}
              >
                {copy.generate.modeTemplates}
              </button>
              <button
                type="button"
                className={[
                  "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                  genMode === "diverse"
                    ? "bg-white text-navy shadow-sm"
                    : "text-body hover:text-navy",
                ].join(" ")}
                aria-pressed={genMode === "diverse"}
                onClick={() => setGenMode("diverse")}
              >
                {copy.generate.modeDiverse}
              </button>
            </div>
            {genMode === "diverse" ? (
              <div
                className="mt-2 inline-flex rounded-xl border border-navy/15 bg-white/80 p-1"
                role="group"
                aria-label={copy.generate.checkMode}
              >
                <button
                  type="button"
                  className={[
                    "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                    genCheck === "verified"
                      ? "bg-white text-navy shadow-sm"
                      : "text-body hover:text-navy",
                  ].join(" ")}
                  aria-pressed={genCheck === "verified"}
                  onClick={() => setGenCheck("verified")}
                >
                  {copy.generate.modeVerified}
                </button>
                <button
                  type="button"
                  className={[
                    "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                    genCheck === "plain"
                      ? "bg-white text-navy shadow-sm"
                      : "text-body hover:text-navy",
                  ].join(" ")}
                  aria-pressed={genCheck === "plain"}
                  onClick={() => setGenCheck("plain")}
                >
                  {copy.generate.modePlain}
                </button>
              </div>
            ) : null}
          </div>
          {genMode === "diverse" ? (
            <div className="rounded-2xl border border-hairline-soft bg-paper p-3">
              <label
                htmlFor={`${genId}-model`}
                className="block text-sm font-medium text-ink"
              >
                {copy.generate.model}
              </label>
              <SelectMenu
                id={`${genId}-model`}
                className="mt-1.5 max-w-md"
                value={genModel}
                onChange={(value) => setGenModel(value as AiModelId)}
                options={AI_MODEL_IDS.map((id) => ({
                  value: id,
                  label: copy.generate.models[id],
                }))}
              />
              {selectedModelStatus ? (
                  <p className="mt-2 text-xs text-body">
                    {walletHint(copy.generate, selectedModelStatus.wallet)}
                  </p>
                ) : null}
              <p className="mt-3 text-xs font-medium text-muted">
                {copy.generate.walletLabel}
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {uniqueProviders(modelStatus).map((status) => {
                  const selected =
                    selectedModelStatus?.provider === status.provider;
                  return (
                    <li key={status.provider}>
                      <button
                        type="button"
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${walletTone(status.wallet, selected)}`}
                        onClick={() => {
                          if (selectedModelStatus?.provider === status.provider) {
                            return;
                          }
                          setGenModel(status.id);
                        }}
                      >
                        {copy.generate.providers[status.provider]}
                        <span className="ms-1.5 text-[10px] opacity-80">
                          {walletChipLabel(copy.generate, status.wallet)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs font-medium text-muted">
                {copy.generate.limitLabel}
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {modelStatus.map((status) => {
                  const selected = status.id === genModel;
                  const tone = !status.configured
                    ? "border-hairline bg-white text-muted"
                    : status.limit > 0 && status.remaining <= 0
                      ? "border-brass/20 bg-brass-tint/40 text-brass-strong"
                      : selected
                        ? "border-navy/20 bg-navy-tint text-navy"
                        : "border-hairline bg-white text-body";
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
                    <li key={status.id}>
                      <button
                        type="button"
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone}`}
                        onClick={() => setGenModel(status.id)}
                      >
                        {copy.generate.models[status.id]}
                        <span className="ms-1.5 text-[10px] opacity-80">
                          {detail}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {genMode === "diverse" ? (
            <label className="block rounded-2xl border border-hairline-soft bg-paper p-3 text-sm font-medium text-ink">
              {copy.generate.request}
              <textarea
                className={`${fieldClass} mt-1.5 min-h-[4.5rem] resize-y`}
                value={genRequest}
                placeholder={copy.generate.requestPlaceholder}
                maxLength={400}
                onChange={(event) => setGenRequest(event.target.value)}
              />
            </label>
          ) : null}
          <div className="rounded-2xl border border-brass/10 bg-brass-tint/30 p-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label
                htmlFor={`${genId}-topic`}
                className="block text-sm font-medium text-ink"
              >
                {copy.generate.topic}
              </label>
              <SelectMenu
                id={`${genId}-topic`}
                className="mt-1.5"
                value={genTopic}
                onChange={(value) =>
                  setGenTopic(value as ProblemTopic | "any")
                }
                options={[
                  ...(genMode === "diverse"
                    ? [{ value: "any" as const, label: copy.generate.anyTopic }]
                    : []),
                  ...PROBLEM_TOPICS.map((topic) => ({
                    value: topic,
                    label: copy.topics[topic],
                  })),
                ]}
              />
            </div>
            <div>
              <label
                htmlFor={`${genId}-difficulty`}
                className="block text-sm font-medium text-ink"
              >
                {copy.generate.difficulty}
              </label>
              <SelectMenu
                id={`${genId}-difficulty`}
                className="mt-1.5"
                value={genDifficulty}
                onChange={(value) =>
                  setGenDifficulty(value as ProblemDifficulty | "any")
                }
                options={[
                  ...(genMode === "diverse"
                    ? [
                        {
                          value: "any" as const,
                          label: copy.generate.anyDifficulty,
                        },
                      ]
                    : []),
                  ...PROBLEM_DIFFICULTIES.map((difficulty) => ({
                    value: difficulty,
                    label: copy.difficulties[difficulty],
                  })),
                ]}
              />
            </div>
            <div>
              <label
                htmlFor={`${genId}-year`}
                className="block text-sm font-medium text-ink"
              >
                {copy.generate.year}
              </label>
              <SelectMenu
                id={`${genId}-year`}
                className="mt-1.5"
                value={genYear}
                onChange={(value) =>
                  setGenYear(value as ProblemYear | "any")
                }
                options={[
                  ...(genMode === "diverse"
                    ? [{ value: "any" as const, label: copy.generate.anyYear }]
                    : []),
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
                max={genMode === "diverse" ? 8 : 12}
                value={genCount}
                onChange={(event) =>
                  setGenCount(
                    Math.min(
                      genMode === "diverse" ? 8 : 12,
                      Math.max(1, Number(event.target.value) || 1),
                    ),
                  )
                }
              />
            </label>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={generating}
                className="inline-flex w-full items-center justify-center rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-strong disabled:opacity-60"
              >
                {generating ? copy.generate.busy : copy.generate.submit}
              </button>
            </div>
          </div>
          {genMode === "diverse" ? (
            <p className="mt-3 text-sm text-muted">{copy.generate.classifyHint}</p>
          ) : null}
          </div>
          {draftIds.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving}
                className="inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-navy-strong disabled:opacity-60"
                onClick={() => void saveDraftsToBank()}
              >
                <Save className="size-4" aria-hidden="true" />
                {saving ? copy.generate.saving : copy.generate.saveToBank}
              </button>
              <button
                type="button"
                disabled={saving}
                className="text-sm font-medium text-navy hover:text-navy-strong disabled:opacity-60"
                onClick={() => void keepAllDrafts()}
              >
                {copy.generate.keepAll}
              </button>
            </div>
          ) : null}
        </form>
      ) : null}

      {panel === "variants" ? (
        <form
          onSubmit={onVariants}
          className={`${panelClass} mt-6 space-y-4 bg-paper`}
          aria-labelledby="variants-heading"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                id="variants-heading"
                className="text-lg font-semibold tracking-tight text-ink"
              >
                {copy.variantPanel.title}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-body">
                {copy.variantPanel.hint}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-paper hover:text-navy"
              aria-label={copy.variantPanel.close}
              onClick={() => setPanel(null)}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          {selected ? (
            <div className="mt-4 rounded-xl bg-paper-deep px-4 py-3">
              <p className="text-xs font-semibold tracking-wide text-muted">
                {copy.variantPanel.sourceLabel}
              </p>
              <p className="mt-1 text-sm font-medium text-ink">
                {copy.instructions[selected.instructionId]}
              </p>
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
                onChange={(event) =>
                  setVariantCount(
                    Math.min(12, Math.max(1, Number(event.target.value) || 1)),
                  )
                }
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong"
            >
              <Shuffle className="size-4" aria-hidden="true" />
              {copy.variantPanel.submit}
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)_22rem]">
        <aside className="relative z-20 rounded-2xl border border-hairline bg-paper p-4 shadow-sm sm:p-5 xl:sticky xl:top-20 xl:self-start">
          <h2 className="text-sm font-semibold tracking-wide text-brass">
            {copy.filtersTitle}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-1">
            <label className="col-span-2 block text-sm font-medium text-ink xl:col-span-1">
              {copy.searchLabel}
              <input
                id={searchId}
                className={`${fieldClass} mt-1.5`}
                type="search"
                value={filters.query}
                placeholder={copy.searchPlaceholder}
                onChange={(event) => updateFilter("query", event.target.value)}
              />
            </label>
            <FilterSelect
              label={copy.generate.topic}
              value={filters.topic}
              allLabel={copy.allTopics}
              options={topicsInBank(bank)}
              labels={Object.fromEntries(
                topicsInBank(bank).map((topic) => [
                  topic,
                  topicLabel(copy.topics, topic),
                ]),
              )}
              onChange={(value) => updateFilter("topic", value)}
            />
            <FilterSelect
              label={copy.generate.difficulty}
              value={filters.difficulty}
              allLabel={copy.allDifficulties}
              options={PROBLEM_DIFFICULTIES}
              labels={copy.difficulties}
              onChange={(value) => updateFilter("difficulty", value)}
            />
            <FilterSelect
              label={copy.generate.year}
              value={filters.year}
              allLabel={copy.allYears}
              options={PROBLEM_YEARS}
              labels={copy.years}
              onChange={(value) => updateFilter("year", value)}
            />
            <FilterSelect
              label={copy.generate.source}
              value={filters.source}
              allLabel={copy.allSources}
              options={PROBLEM_SOURCES}
              labels={copy.sources}
              onChange={(value) => updateFilter("source", value)}
            />
            <FilterSelect
              label={copy.checkFilter}
              value={filters.check}
              allLabel={copy.allChecks}
              options={PROBLEM_CHECKS}
              labels={{
                verified: copy.sources.verified,
                unchecked: copy.sources.unchecked,
              }}
              onChange={(value) => updateFilter("check", value)}
            />
          </div>
          <button
            type="button"
            className="mt-4 text-sm font-medium text-navy hover:text-navy-strong"
            onClick={() => setFilters(EMPTY_PROBLEM_FILTERS)}
          >
            {copy.resetFilters}
          </button>
        </aside>

        <section
          className={`${panelClass} min-h-[24rem] xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto`}
          aria-label={copy.listLabel}
        >
          <p className="text-sm text-muted" aria-live="polite">
            {replaceCount(copy.results, visible.length)}
          </p>
          {visible.length === 0 ? (
            <div className="mt-8 text-center">
              <p className="font-semibold text-ink">{copy.empty}</p>
              <p className="mt-2 text-sm text-body">{copy.emptyHint}</p>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-hairline-soft">
              {visible.map((problem) => {
                const active = problem.id === selectedId;
                const inSet = lessonSetIds.includes(problem.id);

                return (
                  <li key={problem.id}>
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      className={[
                        "flex w-full flex-col gap-2 px-3 py-3 text-left transition-colors",
                        active
                          ? "bg-navy-tint/70"
                          : "hover:bg-paper-deep/80",
                      ].join(" ")}
                      onClick={() => {
                        setSelectedId(problem.id);
                        setShowSolution(false);
                      }}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${difficultyTone[problem.difficulty]}`}
                        >
                          {copy.difficulties[problem.difficulty]}
                        </span>
                        <span className="text-xs font-medium text-muted">
                          {topicLabel(copy.topics, problem.topic)}
                        </span>
                        <span className="text-xs text-muted">
                          {copy.years[problem.year]}
                        </span>
                        {problem.source !== "bank" ? (
                          <span className="rounded-full bg-brass-tint px-2 py-0.5 text-[11px] font-semibold text-brass">
                            {sourceBadgeLabel(copy, problem)}
                          </span>
                        ) : null}
                        {inSet ? (
                          <span className="ml-auto text-[11px] font-semibold text-navy">
                            {copy.inSet}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-sm font-medium text-ink">
                        {copy.instructions[problem.instructionId]}
                      </span>
                      <KatexPreview
                        tex={problem.promptTex}
                        className="text-ink [&_.katex]:text-[0.95rem]"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          className="rounded-2xl border border-navy/10 bg-navy-tint/25 p-4 shadow-sm sm:p-5 xl:sticky xl:top-20 xl:self-start"
          aria-label={copy.previewLabel}
        >
          {selected ? (
            <>
              <p className="text-sm font-semibold tracking-wide text-brass">
                {copy.prompt}
              </p>
              <p className="mt-2 text-base font-semibold text-ink">
                {copy.instructions[selected.instructionId]}
              </p>
              <div className="group relative mt-4 overflow-x-auto rounded-xl bg-paper-deep px-4 py-5 pe-12">
                <KatexPreview
                  tex={selected.promptTex}
                  displayMode
                  className="block text-ink"
                />
                <CopyPromptButton
                  text={selected.promptTex}
                  copyLabel={copy.copyPrompt}
                  copiedLabel={copy.copiedPrompt}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                <span>{topicLabel(copy.topics, selected.topic)}</span>
                <span aria-hidden="true">·</span>
                <span>{copy.difficulties[selected.difficulty]}</span>
                <span aria-hidden="true">·</span>
                <span>{copy.years[selected.year]}</span>
              </div>

              <button
                type="button"
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-navy-strong"
                onClick={() => setShowSolution((value) => !value)}
              >
                {showSolution ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
                {showSolution ? copy.hideSolution : copy.showSolution}
              </button>
              {showSolution ? (
                <div className="mt-3 overflow-x-auto rounded-xl border border-hairline bg-white px-4 py-4">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted">
                    {copy.solution}
                  </p>
                  <KatexPreview
                    tex={selected.solutionTex}
                    displayMode
                    className="block text-ink"
                  />
                </div>
              ) : null}

              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  className={
                    lessonSetIds.includes(selected.id)
                      ? "inline-flex items-center justify-center gap-2 rounded-xl border border-navy/30 bg-navy-tint px-4 py-2.5 text-sm font-semibold text-navy"
                      : "inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong"
                  }
                  onClick={() => void toggleInSet(selected.id)}
                >
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
                {isUnsavedId(selected.id) && selected.source !== "bank" ? (
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
                    }}
                  >
                    <Save className="size-4" aria-hidden="true" />
                    {saving ? copy.generate.saving : copy.generate.saveToBank}
                  </button>
                ) : null}
                {canVary(selected) ? (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-hairline px-4 py-2.5 text-sm font-medium text-body hover:border-navy/30 hover:text-navy"
                    onClick={() => {
                      setPanel("variants");
                      setNotice(null);
                    }}
                  >
                    <Shuffle className="size-4" aria-hidden="true" />
                    {copy.variantPanel.submit}
                  </button>
                ) : null}
                {selected.source !== "bank" ? (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-hairline px-4 py-2.5 text-sm font-medium text-body hover:border-navy/30 hover:text-navy"
                    onClick={() => void discardProblem(selected.id)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    {copy.generate.discard}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-body">{copy.previewEmpty}</p>
          )}
        </section>
      </div>

      <section className={`${panelClass} mt-6`} aria-label={copy.lessonSet}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            {copy.lessonSet}
            <span className="ml-2 text-sm font-medium text-muted">
              {replaceCount(copy.results, lessonSet.length)}
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {lessonSet.length > 0 ? (
              <button
                type="button"
                disabled={saving}
                className="rounded-full border border-hairline px-3 py-1.5 text-sm font-medium text-body hover:border-navy/30 hover:text-navy disabled:opacity-60"
                onClick={() => {
                  void (async () => {
                    setSaving(true);
                    try {
                      await persistLessonSet([]);
                    } finally {
                      setSaving(false);
                    }
                  })();
                }}
              >
                {copy.clearSet}
              </button>
            ) : null}
            <Link
              href={localePath(locale, "/teacher/problems")}
              className="rounded-full bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-strong"
            >
              {copy.actions.openLab}
            </Link>
            <Link
              href={localePath(locale, "/teacher/homework")}
              className="rounded-full border border-hairline bg-white px-3 py-1.5 text-sm font-medium text-body hover:border-navy/30 hover:text-navy"
            >
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
                className="inline-flex items-center gap-1 rounded-full border border-hairline bg-paper py-1 pr-1 pl-3 text-sm text-ink"
              >
                <button
                  type="button"
                  className="inline-flex min-w-0 items-center gap-2 hover:text-navy"
                  onClick={() => setSelectedId(problem.id)}
                >
                  <span className="font-semibold text-navy">{index + 1}</span>
                  <KatexPreview
                    tex={problem.promptTex}
                    className="max-w-[14rem] truncate"
                  />
                </button>
                <button
                  type="button"
                  className="inline-flex size-7 items-center justify-center rounded-full text-muted hover:bg-white hover:text-navy"
                  aria-label={copy.removeFromSet}
                  onClick={() => void toggleInSet(problem.id)}
                >
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

function CopyPromptButton({
  text,
  copyLabel,
  copiedLabel,
}: {
  text: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copyText()}
      aria-label={copied ? copiedLabel : copyLabel}
      className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-lg border border-hairline bg-white text-muted opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:border-navy/30 hover:text-navy focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/15"
    >
      {copied ? (
        <Check className="size-3.5 text-navy" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <p className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-lg font-semibold tabular-nums text-ink">{value}</span>
    </p>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  allLabel,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: T | "all";
  allLabel: string;
  options: readonly T[];
  labels: Record<string, string>;
  onChange: (value: T | "all") => void;
}) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <SelectMenu
        id={id}
        className="mt-1.5"
        value={value}
        onChange={onChange}
        options={[
          { value: "all" as const, label: allLabel },
          ...options.map((option) => ({
            value: option,
            label: labels[option],
          })),
        ]}
      />
    </div>
  );
}
