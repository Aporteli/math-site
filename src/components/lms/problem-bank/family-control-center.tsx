"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileUp,
  Plus,
  Save,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import { KatexPreview } from "@/components/math/katex-preview";
import { AuditPanel } from "@/components/lms/problem-bank/audit-panel";
import { SelectMenu } from "@/components/ui/select-menu";
import type { Locale } from "@/i18n/config";
import {
  deleteFamilyAction,
  generateFromFamilyAction,
  createFamilyKindAction,
  saveFamilyAction,
} from "@/lib/math/problems/actions";
import {
  generateFromTemplate,
  classifyTemplateGenerateFilter,
  collectTemplateGenerateLabels,
  stampFamilySource,
  PROBLEM_DIFFICULTIES,
  PROBLEM_YEARS,
  replaceTokens,
  type BankProblem,
  type ProblemBankCopy,
  type ProblemDifficulty,
  type ProblemInstructionId,
  type ProblemYear,
  type SavedProblemFamily,
  type ImportIssue,
} from "@/lib/math/problems";
import {
  previewTemplateJson,
  readTemplateJson,
  type DiagnoseHint,
  type TemplateDiagnosis,
} from "@/lib/math/problems/templates/diagnose";
import {
  auditVariantPaste,
  mergeIncomingFamilyJson,
  relabelVariantInFamilyJson,
  removeVariantFromFamilyJson,
  removeVariantsFromFamilyJson,
} from "@/lib/math/problems/templates/append-variant";

const fieldClass =
  "w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15";

const panelClass = "rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5";

interface FamilyControlCenterProps {
  locale: Locale;
  copy: ProblemBankCopy;
  families: SavedProblemFamily[];
  count: number;
  difficulty: ProblemDifficulty | "any";
  year: ProblemYear | "any";
  preferredId?: string | null;
  onClose: () => void;
  onFamiliesChange: (families: SavedProblemFamily[]) => void;
  onCreated: (problems: BankProblem[]) => void;
  onNewFamily: () => void;
  onPreferredConsumed?: () => void;
}

function diagnosisHint(
  copy: ProblemBankCopy["importFamily"],
  hint: DiagnoseHint,
) {
  switch (hint) {
    case "json":
      return copy.diagnoseJson;
    case "name":
      return copy.diagnoseName;
    case "enum":
      return copy.diagnoseEnum;
    case "length":
      return copy.diagnoseLength;
    case "missing":
      return copy.diagnoseMissing;
    case "collide":
      return copy.diagnoseCollide;
    case "sample":
      return copy.diagnoseSample;
    case "empty":
      return copy.diagnoseEmpty;
    case "no_match":
      return copy.diagnoseNoMatch;
    default:
      return copy.diagnoseSchema;
  }
}

function familyErrorText(
  copy: ProblemBankCopy["familyCenter"],
  error: string,
) {
  switch (error) {
    case "unauthorized":
      return copy.errorUnauthorized;
    case "invalid":
      return copy.invalidJson;
    case "slug_taken":
      return copy.errorSlugTaken;
    case "not_found":
      return copy.errorNotFound;
    case "empty":
      return copy.emptyGenerate;
    case "no_match":
      return copy.noMatchGenerate;
    default:
      return copy.errorFailed;
  }
}

function instructionLabel(copy: ProblemBankCopy, id: string) {
  if (Object.hasOwn(copy.instructions, id)) {
    return copy.instructions[id as ProblemInstructionId];
  }
  return id;
}

function upsertFamily(
  families: SavedProblemFamily[],
  family: SavedProblemFamily,
) {
  const rest = families.filter((item) => item.id !== family.id);
  return [family, ...rest];
}

export function FamilyControlCenter({
  locale,
  copy,
  families,
  count,
  difficulty,
  year,
  preferredId = null,
  onClose,
  onFamiliesChange,
  onCreated,
  onNewFamily,
  onPreferredConsumed,
}: FamilyControlCenterProps) {
  const nameId = useId();
  const jsonId = useId();
  const variantPasteId = useId();
  const center = copy.familyCenter;
  const [newFamilyName, setNewFamilyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    families[0]?.id ?? null,
  );
  const [jsonText, setJsonText] = useState(families[0]?.json ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [genCount, setGenCount] = useState(count);
  const [genDifficulty, setGenDifficulty] = useState(difficulty);
  const [genYear, setGenYear] = useState(year);
  const [showVariantPaste, setShowVariantPaste] = useState(false);
  const [variantPaste, setVariantPaste] = useState("");
  const [variantAuditIssues, setVariantAuditIssues] = useState<ImportIssue[]>(
    [],
  );
  const [confirmVariantIndex, setConfirmVariantIndex] = useState<number | null>(
    null,
  );
  const [selectedVariantIndexes, setSelectedVariantIndexes] = useState<
    number[]
  >([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const selected = families.find((family) => family.id === selectedId) ?? null;
  const dirty = selected ? jsonText !== selected.json : jsonText.trim().length > 0;

  useEffect(() => {
    if (!preferredId) return;
    const family = families.find((item) => item.id === preferredId);
    if (!family) return;
    setSelectedId(family.id);
    setJsonText(family.json);
    setConfirmDelete(false);
    setConfirmVariantIndex(null);
    setSelectedVariantIndexes([]);
    setConfirmBulkDelete(false);
    onPreferredConsumed?.();
  }, [preferredId, families]);

  useEffect(() => {
    if (preferredId) return;
    if (selectedId && families.some((family) => family.id === selectedId)) {
      return;
    }
    const next = families[0] ?? null;
    setSelectedId(next?.id ?? null);
    setJsonText(next?.json ?? "");
    setConfirmDelete(false);
    setConfirmVariantIndex(null);
    setSelectedVariantIndexes([]);
    setConfirmBulkDelete(false);
  }, [families, selectedId, preferredId]);

  const visibleCount = families.length;

  const familyRead = useMemo(() => {
    if (!jsonText.trim()) return null;
    return readTemplateJson(jsonText);
  }, [jsonText]);

  const preview = useMemo(() => {
    if (!jsonText.trim()) return null;
    return previewTemplateJson(jsonText, {
      count: 1,
      locale,
      difficulty: genDifficulty === "any" ? undefined : genDifficulty,
      year: genYear === "any" ? undefined : genYear,
    });
  }, [jsonText, locale, genDifficulty, genYear]);

  const listedVariants = familyRead?.ok ? familyRead.template.variants : [];

  const familyGenerateLabels = (() => {
    if (!jsonText.trim()) {
      return {
        years: new Set<ProblemYear>(),
        difficulties: new Set<ProblemDifficulty>(),
      };
    }
    try {
      const labels = collectTemplateGenerateLabels(
        JSON.parse(jsonText) as unknown,
      );
      return {
        years: new Set(labels.years),
        difficulties: new Set(labels.difficulties),
      };
    } catch {
      return {
        years: new Set<ProblemYear>(),
        difficulties: new Set<ProblemDifficulty>(),
      };
    }
  })();
  const schemaBlocked = Boolean(jsonText.trim() && familyRead && !familyRead.ok);
  const variantPasteLabels = useMemo(
    () => ({
      difficulty: genDifficulty === "any" ? undefined : genDifficulty,
      year: genYear === "any" ? undefined : genYear,
    }),
    [genDifficulty, genYear],
  );
  const variantPasteIssues = useMemo(() => {
    if (!showVariantPaste || !variantPaste.trim()) return [];
    return auditVariantPaste(jsonText, variantPaste, variantPasteLabels);
  }, [showVariantPaste, variantPaste, jsonText, variantPasteLabels]);
  const allVariantsSelected =
    listedVariants.length > 0 &&
    selectedVariantIndexes.length === listedVariants.length;

  function selectFamily(family: SavedProblemFamily) {
    setSelectedId(family.id);
    setJsonText(family.json);
    setNotice(null);
    setConfirmDelete(false);
    setShowVariantPaste(false);
    setVariantPaste("");
    setVariantAuditIssues([]);
    setConfirmVariantIndex(null);
    setSelectedVariantIndexes([]);
    setConfirmBulkDelete(false);
  }

  async function addNamedFamily() {
    const title = newFamilyName.trim();
    if (!title || creating) return;
    setNotice(null);
    setCreating(true);
    try {
      const result = await createFamilyKindAction({
        title,
        topic: "algebra",
      });
      if (!result.ok) {
        setNotice(familyErrorText(center, result.error));
        return;
      }
      onFamiliesChange(upsertFamily(families, result.family));
      selectFamily(result.family);
      setNewFamilyName("");
      setNotice(center.saved);
    } finally {
      setCreating(false);
    }
  }

  async function persistFamilyJson(nextJson: string, savedNotice: string) {
    const read = readTemplateJson(nextJson);
    if (!read.ok) {
      setNotice(center.invalidJson);
      return false;
    }
    setSaving(true);
    try {
      const result = await saveFamilyAction({
        json: nextJson,
        id: selected?.id,
        title: selected?.title,
        topic: selected?.topic,
      });
      if (!result.ok) {
        if (result.issues?.length) {
          setVariantAuditIssues(result.issues);
          setNotice(null);
        } else {
          setNotice(familyErrorText(center, result.error));
        }
        return false;
      }
      onFamiliesChange(upsertFamily(families, result.family));
      setSelectedId(result.family.id);
      setJsonText(result.family.json);
      setVariantAuditIssues([]);
      setNotice(savedNotice);
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function saveCurrent() {
    setNotice(null);
    await persistFamilyJson(jsonText, center.saved);
  }

  async function generateProblems() {
    setNotice(null);
    setGenerating(true);
    try {
      if (selected && !dirty) {
        const result = await generateFromFamilyAction({
          id: selected.id,
          count: genCount,
          locale,
          difficulty: genDifficulty === "any" ? undefined : genDifficulty,
          year: genYear === "any" ? undefined : genYear,
        });
        if (!result.ok) {
          setNotice(familyErrorText(center, result.error));
          return;
        }
        onCreated(result.problems);
        setNotice(
          replaceTokens(center.generated, { count: result.problems.length }),
        );
        return;
      }

      const read = readTemplateJson(jsonText);
      if (!read.ok) {
        setNotice(center.invalidJson);
        return;
      }
      const created = generateFromTemplate(read.template, {
        count: genCount,
        locale,
        difficulty: genDifficulty === "any" ? undefined : genDifficulty,
        year: genYear === "any" ? undefined : genYear,
      });
      const stamped = selected
        ? stampFamilySource(created, selected)
        : created;
      if (stamped.length === 0) {
        const status = classifyTemplateGenerateFilter(read.template, {
          difficulty: genDifficulty === "any" ? undefined : genDifficulty,
          year: genYear === "any" ? undefined : genYear,
        });
        setNotice(
          status === "no_match" ? center.noMatchGenerate : center.emptyGenerate,
        );
        return;
      }
      onCreated(stamped);
      setNotice(replaceTokens(center.generated, { count: stamped.length }));
    } catch {
      setNotice(center.errorFailed);
    } finally {
      setGenerating(false);
    }
  }

  async function removeSelected() {
    if (!selected) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setNotice(null);
    setSaving(true);
    try {
      const removedId = selected.id;
      const parentId = selected.parentId;
      const result = await deleteFamilyAction(removedId);
      if (!result.ok) {
        setNotice(familyErrorText(center, result.error));
        setConfirmDelete(false);
        return;
      }
      const next = families.filter((family) => {
        if (family.id === removedId) return false;
        if (!parentId && family.parentId === removedId) return false;
        return true;
      });
      onFamiliesChange(next);
      const parent = parentId
        ? (next.find((family) => family.id === parentId) ?? null)
        : null;
      const first = parent ?? next[0] ?? null;
      setSelectedId(first?.id ?? null);
      setJsonText(first?.json ?? "");
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setNotice(center.errorFailed);
    }
  }

  function downloadJson() {
    const slug = selected?.slug ?? "family";
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function addVariant() {
    setShowVariantPaste(true);
    setVariantPaste("");
    setVariantAuditIssues([]);
    setNotice(null);
    window.setTimeout(() => {
      document.getElementById(variantPasteId)?.focus();
    }, 0);
  }

  async function submitVariantPaste() {
    const labels = variantPasteLabels;
    const issues = auditVariantPaste(jsonText, variantPaste, labels);
    setVariantAuditIssues(issues);
    if (issues.length > 0) {
      setNotice(null);
      return;
    }

    const result = mergeIncomingFamilyJson(jsonText, variantPaste, labels);
    if (!result.ok) {
      if (result.issues?.length) {
        setVariantAuditIssues(result.issues);
        setNotice(null);
        return;
      }
      setNotice(
        result.reason === "full"
          ? center.addVariantFull
          : result.reason === "family"
            ? center.addVariantNeedFamily
            : center.addVariantNeedJson,
      );
      return;
    }
    const saved = await persistFamilyJson(
      result.json,
      replaceTokens(center.addVariantAdded, { count: result.added }),
    );
    if (!saved) return;
    setShowVariantPaste(false);
    setVariantPaste("");
    setVariantAuditIssues([]);
    setConfirmDelete(false);
    setConfirmVariantIndex(null);
  }

  async function removeVariantAt(index: number) {
    setNotice(null);
    if (confirmVariantIndex !== index) {
      setConfirmVariantIndex(index);
      setConfirmDelete(false);
      return;
    }
    const result = removeVariantFromFamilyJson(jsonText, index);
    if (!result.ok) {
      setNotice(center.invalidJson);
      setConfirmVariantIndex(null);
      return;
    }
    const saved = await persistFamilyJson(result.json, center.removeVariantDone);
    if (!saved) return;
    setConfirmVariantIndex(null);
    setSelectedVariantIndexes((current) =>
      current.filter((item) => item !== index).map((item) =>
        item > index ? item - 1 : item,
      ),
    );
  }

  async function relabelVariantAt(
    index: number,
    labels: { year?: ProblemYear; difficulty?: ProblemDifficulty },
  ) {
    setNotice(null);
    const result = relabelVariantInFamilyJson(jsonText, index, labels);
    if (!result.ok) {
      setNotice(center.invalidJson);
      return;
    }
    await persistFamilyJson(result.json, center.saved);
  }

  function toggleVariantSelected(index: number) {
    setSelectedVariantIndexes((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index],
    );
    setConfirmBulkDelete(false);
  }

  function toggleSelectAllVariants() {
    setConfirmBulkDelete(false);
    setSelectedVariantIndexes((current) =>
      current.length === listedVariants.length
        ? []
        : listedVariants.map((_, index) => index),
    );
  }

  async function removeSelectedVariants() {
    setNotice(null);
    if (selectedVariantIndexes.length === 0) return;
    if (!confirmBulkDelete) {
      setConfirmBulkDelete(true);
      setConfirmVariantIndex(null);
      setConfirmDelete(false);
      return;
    }
    const result = removeVariantsFromFamilyJson(
      jsonText,
      selectedVariantIndexes,
    );
    if (!result.ok) {
      setNotice(center.invalidJson);
      setConfirmBulkDelete(false);
      return;
    }
    const saved = await persistFamilyJson(
      result.json,
      replaceTokens(center.removeSelectedDone, {
        count: selectedVariantIndexes.length,
      }),
    );
    if (!saved) return;
    setSelectedVariantIndexes([]);
    setConfirmBulkDelete(false);
  }

  const previewBlocked = Boolean(
    preview &&
      "diagnosis" in preview &&
      preview.diagnosis &&
      preview.diagnosis.hint !== "empty",
  );

  return (
    <section className={`${panelClass} mt-6`} aria-labelledby="families-heading">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-4">
        <h2
          id="families-heading"
          className="text-lg font-semibold tracking-tight text-ink"
        >
          {center.title}
        </h2>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-paper hover:text-navy"
          aria-label={center.close}
          onClick={onClose}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col rounded-2xl border border-hairline bg-paper-deep/60 p-3">
          <div className="space-y-2">
            <label className="sr-only" htmlFor={nameId}>
              {center.nameLabel}
            </label>
            <input
              id={nameId}
              className={fieldClass}
              type="text"
              value={newFamilyName}
              maxLength={80}
              placeholder={center.namePlaceholder}
              onChange={(event) => setNewFamilyName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addNamedFamily();
                }
              }}
            />
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-3 py-2 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60"
              disabled={creating || !newFamilyName.trim()}
              onClick={() => void addNamedFamily()}
            >
              <Plus className="size-4" aria-hidden="true" />
              {creating ? center.saving : center.addFamily}
            </button>
          </div>

          <div className="my-3 border-t border-hairline" />

          {visibleCount === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-2 py-8 text-center">
              <p className="text-sm font-semibold text-ink">{center.empty}</p>
              <p className="mt-1 text-xs text-muted">{center.emptyHint}</p>
            </div>
          ) : (
            <ul className="min-h-0 max-h-[28rem] flex-1 space-y-0.5 overflow-y-auto p-1">
              {families.map((family) => {
                const active = family.id === selectedId;
                return (
                  <li key={family.id}>
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      className={[
                        "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors",
                        active
                          ? "bg-white text-navy shadow-sm ring-1 ring-navy/15"
                          : "text-body hover:bg-white/80 hover:text-ink",
                      ].join(" ")}
                      onClick={() => selectFamily(family)}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {family.title || family.slug}
                      </span>
                      <span className="shrink-0 tabular-nums text-[11px] text-muted">
                        {family.variantCount}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className="min-w-0 space-y-4">
          {!selected && !jsonText.trim() ? (
            <p className="rounded-2xl border border-dashed border-hairline bg-paper px-4 py-10 text-center text-sm text-muted">
              {center.selectHint}
            </p>
          ) : (
            <>
              {selected ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold tracking-tight text-ink">
                        {selected.title || selected.slug}
                      </h3>
                      {dirty ? (
                        <span className="rounded-full bg-brass-tint px-2 py-0.5 text-[11px] font-semibold text-brass">
                          {center.unsaved}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {instructionLabel(copy, selected.instructionId)}
                      <span className="mx-1.5 text-hairline" aria-hidden="true">
                        ·
                      </span>
                      {replaceTokens(center.variants, {
                        count: selected.variantCount,
                      })}
                      <span className="mx-1.5 text-hairline" aria-hidden="true">
                        ·
                      </span>
                      {replaceTokens(center.updated, {
                        date: new Date(selected.updatedAt).toLocaleDateString(
                          locale,
                        ),
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2 text-sm font-medium text-body hover:border-navy/30 hover:text-navy"
                    onClick={addVariant}
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    {center.addVariant}
                  </button>
                </div>
              ) : (
                <div className="flex justify-end border-b border-hairline pb-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2 text-sm font-medium text-body hover:border-navy/30 hover:text-navy"
                    onClick={addVariant}
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    {center.addVariant}
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {familyRead?.ok ? (
                  <details className="rounded-2xl border border-hairline bg-white open:shadow-sm">
                    <summary className="cursor-pointer list-none px-3.5 py-2.5 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-muted">›</span>
                        {center.variantsFold}
                        <span className="rounded-full bg-paper-deep px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted">
                          {listedVariants.length}
                        </span>
                      </span>
                    </summary>
                    {listedVariants.length === 0 ? (
                      <p className="border-t border-hairline-soft px-3.5 py-3 text-sm text-muted">
                        {center.emptyVariants}
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2 border-t border-hairline-soft px-3.5 py-2">
                          <label className="inline-flex items-center gap-2 text-xs font-medium text-body">
                            <input
                              type="checkbox"
                              className="size-3.5 rounded border-hairline text-navy focus:ring-navy/30"
                              checked={allVariantsSelected}
                              onChange={toggleSelectAllVariants}
                            />
                            {center.selectAllVariants}
                          </label>
                          {selectedVariantIndexes.length > 0 ? (
                            <>
                              <button
                                type="button"
                                className="text-xs font-medium text-muted hover:text-navy"
                                onClick={() => {
                                  setSelectedVariantIndexes([]);
                                  setConfirmBulkDelete(false);
                                }}
                              >
                                {center.clearVariantSelection}
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg bg-paper px-2 py-1 text-xs font-medium text-body hover:text-navy disabled:opacity-50"
                                disabled={saving}
                                onClick={() => void removeSelectedVariants()}
                              >
                                <Trash2 className="size-3.5" aria-hidden="true" />
                                {confirmBulkDelete
                                  ? replaceTokens(center.confirmRemoveSelected, {
                                      count: selectedVariantIndexes.length,
                                    })
                                  : `${center.removeSelectedVariants} (${selectedVariantIndexes.length})`}
                              </button>
                            </>
                          ) : null}
                        </div>
                        <ul className="max-h-72 space-y-1 overflow-y-auto px-2 pb-2">
                          {listedVariants.map((variant, index) => {
                            const slug =
                              variant.id?.trim() || `task-${index + 1}`;
                            const displayNumber = index + 1;
                            const familyYears = familyRead?.ok
                              ? familyRead.template.years
                              : [];
                            const familyDifficulties = familyRead?.ok
                              ? familyRead.template.difficulties
                              : [];
                            const yearValue =
                              variant.years?.[0] ??
                              familyYears[0] ??
                              PROBLEM_YEARS[0];
                            const difficultyValue =
                              variant.difficulties?.[0] ??
                              familyDifficulties[0] ??
                              PROBLEM_DIFFICULTIES[0];
                            const checked =
                              selectedVariantIndexes.includes(index);
                            return (
                              <li
                                key={`${slug}-${index}`}
                                className="flex flex-wrap items-center gap-2 rounded-xl bg-paper px-3 py-1.5"
                              >
                                <input
                                  type="checkbox"
                                  className="size-3.5 shrink-0 rounded border-hairline text-navy focus:ring-navy/30"
                                  checked={checked}
                                  aria-label={`${displayNumber}`}
                                  title={slug}
                                  onChange={() => toggleVariantSelected(index)}
                                />
                                <span
                                  className="min-w-0 flex-1 truncate text-xs font-medium tabular-nums text-ink"
                                  title={slug}
                                >
                                  {displayNumber}
                                </span>
                                <label
                                  className="sr-only"
                                  htmlFor={`${jsonId}-v-${index}-year`}
                                >
                                  {copy.generate.year}
                                </label>
                                <select
                                  id={`${jsonId}-v-${index}-year`}
                                  className="max-w-[6.75rem] min-w-[5.25rem] rounded-lg border border-hairline bg-white px-1.5 py-1 text-[11px] text-ink focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15 disabled:opacity-60"
                                  disabled={saving}
                                  value={yearValue}
                                  onChange={(event) =>
                                    void relabelVariantAt(index, {
                                      year: event.target.value as ProblemYear,
                                    })
                                  }
                                >
                                  {PROBLEM_YEARS.map((year) => (
                                    <option key={year} value={year}>
                                      {copy.years[year]}
                                    </option>
                                  ))}
                                </select>
                                <label
                                  className="sr-only"
                                  htmlFor={`${jsonId}-v-${index}-difficulty`}
                                >
                                  {copy.generate.difficulty}
                                </label>
                                <select
                                  id={`${jsonId}-v-${index}-difficulty`}
                                  className="max-w-[7.5rem] min-w-[5.5rem] rounded-lg border border-hairline bg-white px-1.5 py-1 text-[11px] text-ink focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15 disabled:opacity-60"
                                  disabled={saving}
                                  value={difficultyValue}
                                  onChange={(event) =>
                                    void relabelVariantAt(index, {
                                      difficulty: event.target
                                        .value as ProblemDifficulty,
                                    })
                                  }
                                >
                                  {PROBLEM_DIFFICULTIES.map((difficulty) => (
                                    <option key={difficulty} value={difficulty}>
                                      {copy.difficulties[difficulty]}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-body hover:bg-white hover:text-navy disabled:opacity-50"
                                  disabled={saving}
                                  onClick={() => void removeVariantAt(index)}
                                >
                                  <Trash2
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                  {confirmVariantIndex === index
                                    ? center.confirmRemoveVariant
                                    : center.removeVariant}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}
                  </details>
                ) : null}

                <details className="rounded-2xl border border-hairline bg-white open:shadow-sm">
                  <summary className="cursor-pointer list-none px-3.5 py-2.5 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-2">
                      <span className="text-muted">›</span>
                      {center.jsonFold}
                    </span>
                  </summary>
                  <div className="border-t border-hairline-soft p-3">
                    <label className="sr-only" htmlFor={jsonId}>
                      {center.jsonLabel}
                    </label>
                    <textarea
                      id={jsonId}
                      className={`${fieldClass} min-h-40 font-mono text-xs`}
                      value={jsonText}
                      spellCheck={false}
                      onChange={(event) => {
                        setJsonText(event.target.value);
                        setConfirmDelete(false);
                      }}
                    />
                  </div>
                </details>
              </div>

              {showVariantPaste ? (
                <div className="rounded-2xl border border-navy/15 bg-navy-tint/30 p-4">
                  <label
                    className="block text-sm font-medium text-ink"
                    htmlFor={variantPasteId}
                  >
                    {center.addVariant}
                  </label>
                  <textarea
                    id={variantPasteId}
                    className={`${fieldClass} mt-2 min-h-36 font-mono text-xs`}
                    value={variantPaste}
                    spellCheck={false}
                    placeholder={center.addVariantPlaceholder}
                    onChange={(event) => {
                      setVariantPaste(event.target.value);
                      setVariantAuditIssues([]);
                      setNotice(null);
                    }}
                  />
                  {variantPasteIssues.length > 0 ? (
                    <div className="mt-3">
                      <AuditPanel
                        copy={copy.importFamily}
                        issues={variantPasteIssues}
                      />
                    </div>
                  ) : variantAuditIssues.length > 0 ? (
                    <div className="mt-3">
                      <AuditPanel
                        copy={copy.importFamily}
                        issues={variantAuditIssues}
                      />
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={
                        saving ||
                        !variantPaste.trim() ||
                        variantPasteIssues.length > 0
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3 py-2 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60"
                      onClick={() => void submitVariantPaste()}
                    >
                      <Plus className="size-3.5" aria-hidden="true" />
                      {center.addVariantSubmit}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2 text-sm font-medium text-body hover:border-navy/30 hover:text-navy"
                      onClick={() => {
                        setShowVariantPaste(false);
                        setVariantPaste("");
                      }}
                    >
                      {center.addVariantCancel}
                    </button>
                  </div>
                </div>
              ) : null}

              {preview && "problem" in preview && preview.problem ? (
                <div className="rounded-2xl border border-hairline bg-paper p-4">
                  <p className="text-xs font-semibold tracking-wide text-brass">
                    {center.preview}
                  </p>
                  <div className="mt-2 overflow-x-auto text-ink">
                    <KatexPreview tex={preview.problem.promptTex} />
                  </div>
                </div>
              ) : preview && "diagnosis" in preview ? (
                <DiagnosisNote
                  copy={copy.importFamily}
                  diagnosis={preview.diagnosis}
                />
              ) : null}

              {notice ? (
                <p
                  className="cursor-pointer text-sm text-brass-strong"
                  onClick={() => setNotice(null)}
                >
                  {notice}
                </p>
              ) : null}

              <div className="rounded-2xl border border-hairline bg-paper p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label
                      className="block text-sm font-medium text-ink"
                      htmlFor={`${jsonId}-difficulty`}
                    >
                      {copy.generate.difficulty}
                    </label>
                    <SelectMenu
                      id={`${jsonId}-difficulty`}
                      className="mt-1.5"
                      value={genDifficulty}
                      onChange={(value) =>
                        setGenDifficulty(value as ProblemDifficulty | "any")
                      }
                      options={[
                        {
                          value: "any" as const,
                          label: copy.generate.anyDifficulty,
                        },
                        ...PROBLEM_DIFFICULTIES.map((item) => {
                          const marked =
                            familyGenerateLabels.difficulties.has(item);
                          return {
                            value: item,
                            label: copy.difficulties[item],
                            marked,
                            hint: marked
                              ? copy.generate.labelInFamily
                              : undefined,
                          };
                        }),
                      ]}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium text-ink"
                      htmlFor={`${jsonId}-year`}
                    >
                      {copy.generate.year}
                    </label>
                    <SelectMenu
                      id={`${jsonId}-year`}
                      className="mt-1.5"
                      value={genYear}
                      onChange={(value) =>
                        setGenYear(value as ProblemYear | "any")
                      }
                      options={[
                        {
                          value: "any" as const,
                          label: copy.generate.anyYear,
                        },
                        ...PROBLEM_YEARS.map((item) => {
                          const marked = familyGenerateLabels.years.has(item);
                          return {
                            value: item,
                            label: copy.years[item],
                            marked,
                            hint: marked
                              ? copy.generate.labelInFamily
                              : undefined,
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
                      onChange={(event) =>
                        setGenCount(
                          Math.min(
                            12,
                            Math.max(1, Number(event.target.value) || 1),
                          ),
                        )
                      }
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60"
                    disabled={saving || schemaBlocked || !jsonText.trim()}
                    onClick={() => void saveCurrent()}
                  >
                    <Save className="size-4" aria-hidden="true" />
                    {saving ? center.saving : center.save}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy/20 bg-white px-4 py-2.5 text-sm font-semibold text-navy hover:border-navy/40 hover:bg-navy-tint disabled:opacity-60"
                    disabled={
                      generating ||
                      previewBlocked ||
                      listedVariants.length === 0 ||
                      !jsonText.trim()
                    }
                    onClick={() => void generateProblems()}
                  >
                    <Shuffle className="size-4" aria-hidden="true" />
                    {generating ? center.generating : center.generate}
                  </button>
                  <div className="ms-auto flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm font-medium text-body hover:border-navy/30 hover:text-navy disabled:opacity-60"
                      disabled={!jsonText.trim()}
                      onClick={() => void copyJson()}
                    >
                      {copied ? (
                        <Check className="size-4 text-navy" aria-hidden="true" />
                      ) : (
                        <Copy className="size-4" aria-hidden="true" />
                      )}
                      {copied ? center.copied : center.copyJson}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm font-medium text-body hover:border-navy/30 hover:text-navy disabled:opacity-60"
                      disabled={!jsonText.trim()}
                      onClick={downloadJson}
                    >
                      <Download className="size-4" aria-hidden="true" />
                      {center.download}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm font-medium text-body hover:border-navy/30 hover:text-navy"
                      onClick={onNewFamily}
                    >
                      <FileUp className="size-4" aria-hidden="true" />
                      {center.newFamily}
                    </button>
                    {selected ? (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm font-medium text-body hover:border-navy/30 hover:text-navy disabled:opacity-60"
                        disabled={saving}
                        onClick={() => void removeSelected()}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        {confirmDelete ? center.confirmDelete : center.delete}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function DiagnosisNote({
  copy,
  diagnosis,
}: {
  copy: ProblemBankCopy["importFamily"];
  diagnosis: TemplateDiagnosis;
}) {
  return (
    <div className="rounded-2xl border border-brass/25 bg-brass-tint px-4 py-3">
      <p className="text-xs font-semibold tracking-wide text-brass">
        {copy.diagnoseTitle}
      </p>
      <p className="mt-1 text-sm text-brass-strong">
        {diagnosisHint(copy, diagnosis.hint)}
      </p>
      {diagnosis.lines.length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-navy">
            {copy.diagnoseDetails}
          </summary>
          <ul className="mt-2 space-y-1 font-mono text-xs text-ink">
            {diagnosis.lines.map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
