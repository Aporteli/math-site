"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff, Library, Plus, Shuffle, Trash2, X } from "lucide-react";
import { KatexPreview } from "@/components/math/katex-preview";
import { PageHero } from "@/components/ui/page-hero";
import { localePath, type Locale } from "@/i18n/config";
import { generateDiverseProblemsAction } from "@/lib/math/problems/actions";
import {
  EMPTY_PROBLEM_FILTERS,
  PROBLEM_BANK_TOOLS,
  PROBLEM_DIFFICULTIES,
  PROBLEM_SOURCES,
  PROBLEM_TOPICS,
  PROBLEM_YEARS,
  SEED_PROBLEM_BANK,
  filterProblems,
  generateDiverseProblemsSchema,
  generateProblems,
  generateProblemsSchema,
  generateVariants,
  canVary,
  replaceCount,
  replaceTokens,
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
}

export function ProblemBankWorkspace({
  locale,
  title,
  subtitle,
  copy,
}: ProblemBankWorkspaceProps) {
  const searchId = useId();
  const [bank, setBank] = useState<BankProblem[]>(SEED_PROBLEM_BANK);
  const [filters, setFilters] = useState<ProblemFilters>(EMPTY_PROBLEM_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(
    SEED_PROBLEM_BANK[0]?.id ?? null,
  );
  const [lessonSetIds, setLessonSetIds] = useState<string[]>([]);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [showSolution, setShowSolution] = useState(false);
  const [panel, setPanel] = useState<"generate" | "variants" | null>("generate");
  const [notice, setNotice] = useState<string | null>(null);
  const [genTopic, setGenTopic] = useState<ProblemTopic>("vectors");
  const [genDifficulty, setGenDifficulty] = useState<ProblemDifficulty>("medium");
  const [genYear, setGenYear] = useState<ProblemYear>("9");
  const [genCount, setGenCount] = useState(5);
  const [genMode, setGenMode] = useState<"templates" | "diverse">("diverse");
  const [genRequest, setGenRequest] = useState("");
  const [generating, setGenerating] = useState(false);
  const [variantCount, setVariantCount] = useState(5);

  const visible = filterProblems(bank, filters);
  const selected = bank.find((problem) => problem.id === selectedId) ?? null;
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

  function toggleInSet(id: string) {
    setLessonSetIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function discardProblem(id: string) {
    setBank((current) => current.filter((problem) => problem.id !== id));
    setLessonSetIds((current) => current.filter((item) => item !== id));
    setDraftIds((current) => current.filter((item) => item !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setShowSolution(false);
    }
  }

  function keepAllDrafts() {
    setLessonSetIds((current) => {
      const next = [...current];
      for (const id of draftIds) {
        if (!next.includes(id)) next.push(id);
      }
      return next;
    });
  }

  function applyCreated(created: BankProblem[]) {
    if (created.length === 0) return;
    setBank((current) => [...created, ...current]);
    setDraftIds(created.map((problem) => problem.id));
    setSelectedId(created[0]?.id ?? null);
    setShowSolution(false);
    setFilters({
      query: "",
      topic: created[0]?.topic ?? "all",
      difficulty: "all",
      year: "all",
      source: created[0]?.source ?? "all",
    });
  }

  async function onGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (genMode === "templates") {
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
      topic: genTopic,
      difficulty: genDifficulty,
      year: genYear,
      count: Math.min(8, genCount),
      locale,
    });
    if (!parsed.success) return;

    setGenerating(true);
    setNotice(null);
    try {
      const result = await generateDiverseProblemsAction(parsed.data);

      if (!result.ok) {
        const messages = {
          missing_key: copy.generate.errorMissingKey,
          failed: copy.generate.errorFailed,
          none_verified: copy.generate.errorNoneVerified,
          unauthorized: copy.generate.errorUnauthorized,
        } as const;
        setNotice(messages[result.error]);
        return;
      }

      applyCreated(result.problems);
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
          className={`${panelClass} mt-6`}
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
                  ? copy.generate.requestHint
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
          <div
            className="mt-4 inline-flex rounded-xl border border-hairline bg-paper p-1"
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
              onClick={() => setGenMode("templates")}
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
            <label className="mt-4 block text-sm font-medium text-ink">
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
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block text-sm font-medium text-ink">
              {copy.generate.topic}
              <select
                className={`${fieldClass} mt-1.5`}
                value={genTopic}
                onChange={(event) =>
                  setGenTopic(event.target.value as ProblemTopic)
                }
              >
                {PROBLEM_TOPICS.map((topic) => (
                  <option key={topic} value={topic}>
                    {copy.topics[topic]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-ink">
              {copy.generate.difficulty}
              <select
                className={`${fieldClass} mt-1.5`}
                value={genDifficulty}
                onChange={(event) =>
                  setGenDifficulty(event.target.value as ProblemDifficulty)
                }
              >
                {PROBLEM_DIFFICULTIES.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {copy.difficulties[difficulty]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-ink">
              {copy.generate.year}
              <select
                className={`${fieldClass} mt-1.5`}
                value={genYear}
                onChange={(event) => setGenYear(event.target.value as ProblemYear)}
              >
                {PROBLEM_YEARS.map((year) => (
                  <option key={year} value={year}>
                    {copy.years[year]}
                  </option>
                ))}
              </select>
            </label>
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
          {draftIds.length > 0 ? (
            <button
              type="button"
              className="mt-4 text-sm font-medium text-navy hover:text-navy-strong"
              onClick={keepAllDrafts}
            >
              {copy.generate.keepAll}
            </button>
          ) : null}
        </form>
      ) : null}

      {panel === "variants" ? (
        <form
          onSubmit={onVariants}
          className={`${panelClass} mt-6`}
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
        <aside className={`${panelClass} xl:sticky xl:top-20 xl:self-start`}>
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
              options={PROBLEM_TOPICS}
              labels={copy.topics}
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
                          {copy.topics[problem.topic]}
                        </span>
                        <span className="text-xs text-muted">
                          {copy.years[problem.year]}
                        </span>
                        {problem.source !== "bank" ? (
                          <span className="rounded-full bg-brass-tint px-2 py-0.5 text-[11px] font-semibold text-brass">
                            {copy.sources[problem.source]}
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
          className={`${panelClass} xl:sticky xl:top-20 xl:self-start`}
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
              <div className="mt-4 overflow-x-auto rounded-xl bg-paper-deep px-4 py-5">
                <KatexPreview
                  tex={selected.promptTex}
                  displayMode
                  className="block text-ink"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                <span>{copy.topics[selected.topic]}</span>
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
                  onClick={() => toggleInSet(selected.id)}
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
                    onClick={() => discardProblem(selected.id)}
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
                className="rounded-full border border-hairline px-3 py-1.5 text-sm font-medium text-body hover:border-navy/30 hover:text-navy"
                onClick={() => setLessonSetIds([])}
              >
                {copy.clearSet}
              </button>
            ) : null}
            <Link
              href={localePath(locale, "/teacher/lab")}
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
                  onClick={() => toggleInSet(problem.id)}
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
  labels: Record<T, string>;
  onChange: (value: T | "all") => void;
}) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <select
        className={`${fieldClass} mt-1.5`}
        value={value}
        onChange={(event) => onChange(event.target.value as T | "all")}
      >
        <option value="all">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
