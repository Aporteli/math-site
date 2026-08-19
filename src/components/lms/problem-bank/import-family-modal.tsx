"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ClipboardPaste, FileJson, Image, PenLine, Type, X } from "lucide-react";
import { KatexPreview } from "@/components/math/katex-preview";
import { proposeTemplateAction, saveFamilyAction } from "@/lib/math/problems/actions";
import {
  generateFromTemplate,
  classifyTemplateGenerateFilter,
  replaceTokens,
  type AiModelId,
  type BankProblem,
  type ProblemBankCopy,
  type ProblemDifficulty,
  type ProblemYear,
  type SavedProblemFamily,
} from "@/lib/math/problems";
import { checkTemplateProblem } from "@/lib/math/problems/templates/check";
import {
  previewTemplateJson,
  readTemplateJson,
  type DiagnoseHint,
  type TemplateDiagnosis,
} from "@/lib/math/problems/templates/diagnose";
import type { Locale } from "@/i18n/config";

const fieldClass =
  "w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15";

type SourceId = "type" | "screenshot" | "handwriting" | "json" | "jsonPaste";

interface ImportFamilyModalProps {
  locale: Locale;
  copy: ProblemBankCopy;
  count: number;
  difficulty: ProblemDifficulty | "any";
  year: ProblemYear | "any";
  model: AiModelId;
  onClose: () => void;
  onCreated: (problems: BankProblem[]) => void;
  onFamilySaved?: (family: SavedProblemFamily) => void;
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

function DiagnosisPanel({
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

function errorText(copy: ProblemBankCopy["importFamily"], error: string) {
  switch (error) {
    case "unsupported":
      return copy.unsupported;
    case "invalid":
    case "invalidTemplate":
      return copy.invalidTemplate;
    case "invalidJson":
      return copy.invalidJson;
    case "fileTooLarge":
      return copy.fileTooLarge;
    case "badImage":
      return copy.badImage;
    case "empty":
      return copy.empty;
    case "missing_key":
      return copy.errorMissingKey;
    case "invalid_key":
      return copy.errorInvalidKey;
    case "limit_exceeded":
      return copy.errorLimit;
    case "unauthorized":
      return copy.errorUnauthorized;
    case "billing":
      return copy.errorBilling;
    case "timeout":
      return copy.errorTimeout;
    case "bad_output":
      return copy.errorBadOutput;
    default:
      return copy.errorFailed;
  }
}

async function fileAsText(file: File) {
  return file.text();
}

async function compressImage(file: File) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error("badImage");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = document.createElement("img");
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("badImage"));
      img.src = objectUrl;
    });
    const max = 1600;
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("failed");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (next) => (next ? resolve(next) : reject(new Error("fileTooLarge"))),
        "image/jpeg",
        0.82,
      );
    });
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("failed"));
      reader.readAsDataURL(blob);
    });
    const data = dataUrl.split(",")[1] ?? "";
    if (data.length > 1_200_000) throw new Error("fileTooLarge");
    return { mimeType: "image/jpeg" as const, data };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function ImportFamilyModal({
  locale,
  copy,
  count,
  difficulty,
  year,
  model,
  onClose,
  onCreated,
  onFamilySaved,
}: ImportFamilyModalProps) {
  const titleId = useId();
  const family = copy.importFamily;
  const [source, setSource] = useState<SourceId>("type");
  const [text, setText] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingFamily, setSavingFamily] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [casNotice, setCasNotice] = useState<string | null>(null);
  const [casOk, setCasOk] = useState<boolean | null>(null);

  const sources: { id: SourceId; label: string; icon: typeof Type }[] = [
    { id: "type", label: family.sourceType, icon: Type },
    { id: "screenshot", label: family.sourceScreenshot, icon: Image },
    { id: "handwriting", label: family.sourceHandwriting, icon: PenLine },
    { id: "json", label: family.sourceJson, icon: FileJson },
    { id: "jsonPaste", label: family.sourceJsonPaste, icon: ClipboardPaste },
  ];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    setCasNotice(null);
    setCasOk(null);
  }, [jsonText]);

  const preview = useMemo(() => {
    if (!jsonText.trim()) return null;
    const result = previewTemplateJson(jsonText, {
      count: 1,
      locale,
      difficulty: difficulty === "any" ? undefined : difficulty,
      year: year === "any" ? undefined : year,
    });
    if (!result.ok) return { diagnosis: result.diagnosis };
    return { problem: result.problem };
  }, [jsonText, locale, difficulty, year]);

  function applyJsonText(raw: string) {
    setNotice(null);
    if (!raw.trim()) {
      setNotice(family.empty);
      return;
    }
    const read = readTemplateJson(raw);
    if (!read.ok) {
      setJsonText(raw);
      return;
    }
    setJsonText(JSON.stringify(read.template, null, 2));
  }

  async function onJsonFile(file: File) {
    setNotice(null);
    if (file.size > 80_000) {
      setNotice(family.fileTooLarge);
      return;
    }
    try {
      const raw = await fileAsText(file);
      setFileName(file.name);
      applyJsonText(raw);
    } catch {
      setNotice(family.invalidJson);
    }
  }

  async function onImageFile(file: File) {
    setNotice(null);
    setBusy(true);
    try {
      const image = await compressImage(file);
      setFileName(file.name);
      const result = await proposeTemplateAction({
        locale,
        text: text.trim() || undefined,
        image,
        model,
      });
      if (!result.ok) {
        setNotice(errorText(family, result.error));
        return;
      }
      setJsonText(result.json);
    } catch (error) {
      const code = error instanceof Error ? error.message : "failed";
      setNotice(errorText(family, code));
    } finally {
      setBusy(false);
    }
  }

  async function analyzeTyped() {
    if (!text.trim()) {
      setNotice(family.empty);
      return;
    }
    setNotice(null);
    setBusy(true);
    try {
      const result = await proposeTemplateAction({
        locale,
        text: text.trim(),
        model,
      });
      if (!result.ok) {
        setNotice(errorText(family, result.error));
        return;
      }
      setJsonText(result.json);
    } finally {
      setBusy(false);
    }
  }

  function buildProblems() {
    setNotice(null);
    const read = readTemplateJson(jsonText);
    if (!read.ok) return;
    try {
      const created = generateFromTemplate(read.template, {
        count,
        locale,
        difficulty: difficulty === "any" ? undefined : difficulty,
        year: year === "any" ? undefined : year,
      });
      if (created.length === 0) {
        const status = classifyTemplateGenerateFilter(read.template, {
          difficulty: difficulty === "any" ? undefined : difficulty,
          year: year === "any" ? undefined : year,
        });
        setNotice(
          status === "no_match"
            ? copy.familyCenter.noMatchGenerate
            : copy.familyCenter.emptyGenerate,
        );
        return;
      }
      onCreated(created);
      onClose();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : family.errorFailed);
    }
  }

  async function saveFamily() {
    setNotice(null);
    const read = readTemplateJson(jsonText);
    if (!read.ok) {
      setNotice(family.invalidTemplate);
      return;
    }
    setSavingFamily(true);
    try {
      const result = await saveFamilyAction({ json: jsonText });
      if (!result.ok) {
        setNotice(
          result.error === "unauthorized"
            ? family.errorUnauthorized
            : result.error === "slug_taken"
              ? family.errorSlugTaken
              : family.errorFailed,
        );
        return;
      }
      onFamilySaved?.(result.family);
      setNotice(family.familySaved);
    } finally {
      setSavingFamily(false);
    }
  }

  function checkPreviewCas() {
    setCasNotice(null);
    setCasOk(null);
    if (!preview?.problem) return;
    try {
      const result = checkTemplateProblem(JSON.parse(jsonText), preview.problem);
      if (result.ok) {
        setCasOk(true);
        setCasNotice(replaceTokens(family.checkCasOk, { value: result.value }));
        return;
      }
      setCasOk(false);
      if (result.reason === "no_formula") {
        setCasNotice(family.checkCasNoFormula);
        return;
      }
      if (result.reason === "mismatch") {
        setCasNotice(
          replaceTokens(family.checkCasMismatch, {
            got: result.got ?? "",
            expected: result.expected ?? "",
          }),
        );
        return;
      }
      setCasNotice(family.checkCasFail);
    } catch {
      setCasOk(false);
      setCasNotice(family.invalidJson);
    }
  }

  const photoHint =
    source === "handwriting" ? family.handwritingHint : family.photoHint;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <button
        type="button"
        className="absolute inset-0 bg-navy-strong/40 backdrop-blur-sm"
        aria-label={family.close}
        onClick={onClose}
      />
      <div className="pointer-events-none relative z-10 flex h-full items-center justify-center p-4 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="pointer-events-auto flex max-h-full w-full max-w-2xl min-h-0 flex-col overflow-hidden rounded-2xl border border-hairline bg-white shadow-lg shadow-navy/10"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-5">
          <div>
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
              {family.title}
            </h2>
            <p className="mt-1 text-sm text-body">{family.hint}</p>
          </div>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-paper hover:text-navy"
            aria-label={family.close}
            onClick={onClose}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <div
          className="inline-flex flex-wrap rounded-xl border border-navy/15 bg-paper p-1"
          role="tablist"
          aria-label={family.source}
        >
          {sources.map((item) => {
            const Icon = item.icon;
            const active = source === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={[
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                  active ? "bg-white text-navy shadow-sm" : "text-body hover:text-navy",
                ].join(" ")}
                onClick={() => {
                  setSource(item.id);
                  setNotice(null);
                  setFileName(null);
                }}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-3">
          {source === "type" ? (
            <>
              <label className="block text-sm font-medium text-ink" htmlFor={`${titleId}-text`}>
                {family.typeLabel}
              </label>
              <textarea
                id={`${titleId}-text`}
                className={`${fieldClass} min-h-28`}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={family.typePlaceholder}
              />
              <p className="text-xs text-muted">{family.typeHint}</p>
              <button
                type="button"
                className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-strong disabled:opacity-60"
                disabled={busy}
                onClick={() => void analyzeTyped()}
              >
                {busy ? family.building : family.analyze}
              </button>
            </>
          ) : null}

          {source === "screenshot" || source === "handwriting" ? (
            <>
              <label className="block text-sm font-medium text-ink" htmlFor={`${titleId}-image`}>
                {family.photoLabel}
              </label>
              <input
                id={`${titleId}-image`}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="block w-full text-sm text-body file:me-3 file:rounded-lg file:border-0 file:bg-navy-tint file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-navy"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onImageFile(file);
                  event.target.value = "";
                }}
              />
              <p className="text-xs text-muted">{photoHint}</p>
              {fileName ? (
                <p className="text-xs text-ink">{fileName}</p>
              ) : null}
              {busy ? <p className="text-sm text-body">{family.building}</p> : null}
            </>
          ) : null}

          {source === "json" ? (
            <>
              <label className="block text-sm font-medium text-ink" htmlFor={`${titleId}-json`}>
                {family.jsonLabel}
              </label>
              <input
                id={`${titleId}-json`}
                type="file"
                accept="application/json,.json"
                className="block w-full text-sm text-body file:me-3 file:rounded-lg file:border-0 file:bg-navy-tint file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-navy"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onJsonFile(file);
                  event.target.value = "";
                }}
              />
              <p className="text-xs text-muted">{family.jsonHint}</p>
              {fileName ? (
                <p className="text-xs text-ink">{fileName}</p>
              ) : null}
            </>
          ) : null}

          {source === "jsonPaste" ? (
            <>
              <label className="block text-sm font-medium text-ink" htmlFor={`${titleId}-json-paste`}>
                {family.jsonPasteLabel}
              </label>
              <textarea
                id={`${titleId}-json-paste`}
                className={`${fieldClass} min-h-40 font-mono text-xs`}
                value={jsonText}
                onChange={(event) => setJsonText(event.target.value)}
                placeholder={family.jsonPastePlaceholder}
                spellCheck={false}
              />
              <p className="text-xs text-muted">{family.jsonPasteHint}</p>
              <button
                type="button"
                className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-strong"
                onClick={() => applyJsonText(jsonText)}
              >
                {family.jsonPasteRead}
              </button>
            </>
          ) : null}

          {notice ? <p className="text-sm text-brass-strong">{notice}</p> : null}

          {jsonText && source !== "jsonPaste" ? (
            <>
              <label className="block text-sm font-medium text-ink" htmlFor={`${titleId}-preview-json`}>
                {family.jsonPreview}
              </label>
              <textarea
                id={`${titleId}-preview-json`}
                className={`${fieldClass} min-h-40 font-mono text-xs`}
                value={jsonText}
                onChange={(event) => setJsonText(event.target.value)}
                spellCheck={false}
              />
            </>
          ) : null}

          {jsonText ? (
            <>
              {preview?.problem ? (
                <div className="rounded-2xl border border-hairline bg-paper p-3">
                  <p className="text-xs font-semibold tracking-wide text-brass">
                    {family.preview}
                  </p>
                  <div className="mt-2 text-ink">
                    <KatexPreview tex={preview.problem.promptTex} />
                  </div>
                </div>
              ) : preview?.diagnosis ? (
                <DiagnosisPanel copy={family} diagnosis={preview.diagnosis} />
              ) : null}
              {casNotice ? (
                <p
                  className={
                    casOk
                      ? "text-sm text-navy"
                      : "text-sm text-brass-strong"
                  }
                >
                  {casNotice}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-navy/20 bg-white px-4 py-2 text-sm font-semibold text-navy shadow-sm hover:border-navy/40 hover:bg-navy-tint disabled:opacity-60"
                  disabled={Boolean(preview?.diagnosis) || !preview?.problem}
                  onClick={checkPreviewCas}
                >
                  {family.checkCas}
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-strong disabled:opacity-60"
                  disabled={Boolean(preview?.diagnosis) || !preview?.problem}
                  onClick={buildProblems}
                >
                  {family.build}
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-navy/20 bg-white px-4 py-2 text-sm font-semibold text-navy shadow-sm hover:border-navy/40 hover:bg-navy-tint disabled:opacity-60"
                  disabled={
                    Boolean(preview?.diagnosis) ||
                    !preview?.problem ||
                    savingFamily
                  }
                  onClick={() => void saveFamily()}
                >
                  {savingFamily ? family.savingFamily : family.saveFamily}
                </button>
              </div>
            </>
          ) : null}
        </div>
        </div>
      </div>
      </div>
    </div>,
    document.body,
  );
}
