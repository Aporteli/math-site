'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardPaste, FileJson, Image, PenLine, Type, X } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import { AuditPanel } from '@/components/lms/problem-bank/audit-panel';
import { proposeTemplateAction, saveFamilyAction } from '@/lib/math/problems/actions';
import {
  generateFromTemplate,
  classifyTemplateGenerateFilter,
  replaceTokens,
  auditImportJson,
  type AiModelId,
  type BankProblem,
  type ImportIssue,
  type ProblemBankCopy,
  type ProblemDifficulty,
  type ProblemYear,
  type SavedProblemFamily,
} from '@/lib/math/problems';
import { checkTemplateProblem } from '@/lib/math/problems/templates/check';
import {
  previewTemplateJson,
  readTemplateJson,
  type DiagnoseHint,
  type TemplateDiagnosis,
} from '@/lib/math/problems/templates/diagnose';
import type { Locale } from '@/i18n/config';

const fieldClass =
  'w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15';

const JSON_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
const IMAGE_MIME = /^image\/(jpeg|png|webp)$/;

function imageFileFromList(files: FileList | File[] | null | undefined) {
  if (!files) return null;
  for (const file of Array.from(files)) {
    if (IMAGE_MIME.test(file.type)) return file;
  }
  return null;
}

function imageFileFromDataTransfer(data: DataTransfer | null | undefined) {
  if (!data) return null;
  const fromFiles = imageFileFromList(data.files);
  if (fromFiles) return fromFiles;
  for (const item of Array.from(data.items)) {
    if (item.kind !== 'file' || !IMAGE_MIME.test(item.type)) continue;
    const file = item.getAsFile();
    if (file) return file;
  }
  return null;
}

type SourceId = 'type' | 'screenshot' | 'handwriting' | 'json' | 'jsonPaste';

interface ImportFamilyModalProps {
  locale: Locale;
  copy: ProblemBankCopy;
  difficulty: ProblemDifficulty | 'any';
  year: ProblemYear | 'any';
  model: AiModelId;
  onClose: () => void;
  onCreated: (problems: BankProblem[]) => void;
  onFamilySaved?: (family: SavedProblemFamily) => void;
}

function diagnosisHint(copy: ProblemBankCopy['importFamily'], hint: DiagnoseHint) {
  switch (hint) {
    case 'json':
      return copy.diagnoseJson;
    case 'name':
      return copy.diagnoseName;
    case 'enum':
      return copy.diagnoseEnum;
    case 'length':
      return copy.diagnoseLength;
    case 'missing':
      return copy.diagnoseMissing;
    case 'collide':
      return copy.diagnoseCollide;
    case 'sample':
      return copy.diagnoseSample;
    case 'empty':
      return copy.diagnoseEmpty;
    case 'no_match':
      return copy.diagnoseNoMatch;
    default:
      return copy.diagnoseSchema;
  }
}

function DiagnosisPanel({ copy, diagnosis }: { copy: ProblemBankCopy['importFamily']; diagnosis: TemplateDiagnosis }) {
  return (
    <div className="rounded-2xl border border-brass/25 bg-brass-tint px-4 py-3">
      <p className="text-xs font-semibold tracking-wide text-brass">{copy.diagnoseTitle}</p>
      <p className="mt-1 text-sm text-brass-strong">{diagnosisHint(copy, diagnosis.hint)}</p>
      {diagnosis.lines.length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-navy">{copy.diagnoseDetails}</summary>
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

function errorText(copy: ProblemBankCopy['importFamily'], error: string) {
  switch (error) {
    case 'unsupported':
      return copy.unsupported;
    case 'invalid':
    case 'invalidTemplate':
      return copy.invalidTemplate;
    case 'invalidJson':
      return copy.invalidJson;
    case 'fileTooLarge':
      return copy.fileTooLarge;
    case 'badImage':
      return copy.badImage;
    case 'empty':
      return copy.empty;
    case 'missing_key':
      return copy.errorMissingKey;
    case 'invalid_key':
      return copy.errorInvalidKey;
    case 'limit_exceeded':
      return copy.errorLimit;
    case 'unauthorized':
      return copy.errorUnauthorized;
    case 'billing':
      return copy.errorBilling;
    case 'timeout':
      return copy.errorTimeout;
    case 'bad_output':
      return copy.errorBadOutput;
    default:
      return copy.errorFailed;
  }
}

async function fileAsText(file: File) {
  return file.text();
}

async function compressImage(file: File) {
  if (!IMAGE_MIME.test(file.type)) {
    throw new Error('badImage');
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = document.createElement('img');
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('badImage'));
      img.src = objectUrl;
    });
    const max = 1600;
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('failed');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((next) => (next ? resolve(next) : reject(new Error('fileTooLarge'))), 'image/jpeg', 0.82);
    });
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('failed'));
      reader.readAsDataURL(blob);
    });
    const data = dataUrl.split(',')[1] ?? '';
    if (data.length > 1_200_000) throw new Error('fileTooLarge');
    return { mimeType: 'image/jpeg' as const, data };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function ImportFamilyModal({
  locale,
  copy,
  difficulty: _difficulty,
  year: _year,
  model,
  onClose,
  onCreated,
  onFamilySaved,
}: ImportFamilyModalProps) {
  const titleId = useId();
  const family = copy.importFamily;
  const [source, setSource] = useState<SourceId>('screenshot');
  const [text, setText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [savingFamily, setSavingFamily] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [casNotice, setCasNotice] = useState<string | null>(null);
  const [casOk, setCasOk] = useState<boolean | null>(null);
  const [auditIssues, setAuditIssues] = useState<ImportIssue[]>([]);

  const sources: { id: SourceId; label: string; icon: typeof Type }[] = [
    // { id: "type", label: family.sourceType, icon: Type },
    { id: 'screenshot', label: family.sourceScreenshot, icon: Image },
    // { id: "handwriting", label: family.sourceHandwriting, icon: PenLine },
    // { id: "json", label: family.sourceJson, icon: FileJson },
    // { id: "jsonPaste", label: family.sourceJsonPaste, icon: ClipboardPaste },
  ];

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

  useEffect(() => {
    setCasNotice(null);
    setCasOk(null);
  }, [jsonText]);

  const preview = useMemo(() => {
    if (!jsonText.trim()) return null;
    // Import preview must not use the Generate panel year/difficulty filters —
    // photo/typed JSON often pins its own labels and would otherwise show "no match".
    const result = previewTemplateJson(jsonText, {
      count: 1,
      locale,
    });
    if (!result.ok) return { diagnosis: result.diagnosis };
    return { problem: result.problem };
  }, [jsonText, locale]);

  function applyJsonText(raw: string) {
    setNotice(null);
    if (!raw.trim()) {
      setNotice(family.empty);
      setAuditIssues([]);
      return;
    }
    const issues = auditImportJson(raw);
    if (issues.length > 0) {
      setJsonText(raw);
      setAuditIssues(issues);
      return;
    }
    setAuditIssues([]);
    const read = readTemplateJson(raw);
    if (!read.ok) {
      setJsonText(raw);
      return;
    }
    setJsonText(JSON.stringify(read.template, null, 2));
  }

  async function onJsonFile(file: File) {
    setNotice(null);
    if (file.size > JSON_UPLOAD_MAX_BYTES) {
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
        if (result.issues && result.issues.length > 0) {
          setAuditIssues(result.issues);
        }
        if (result.json) setJsonText(result.json);
        return;
      }
      setAuditIssues([]);
      setJsonText(result.json);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'failed';
      setNotice(errorText(family, code));
    } finally {
      setBusy(false);
    }
  }

  const onImageFileRef = useRef(onImageFile);
  onImageFileRef.current = onImageFile;

  useEffect(() => {
    if (source !== 'screenshot' && source !== 'handwriting') return;

    function onPaste(event: ClipboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("textarea, input, [contenteditable='true']")) {
        return;
      }
      const file = imageFileFromDataTransfer(event.clipboardData);
      if (!file) return;
      event.preventDefault();
      void onImageFileRef.current(file);
    }

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [source]);

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
        if (result.issues && result.issues.length > 0) {
          setAuditIssues(result.issues);
        }
        if (result.json) setJsonText(result.json);
        return;
      }
      setAuditIssues([]);
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
      const variantCount = read.template.variants.length;
      if (variantCount === 0) {
        setNotice(copy.familyCenter.emptyGenerate);
        return;
      }
      // One card per problem found in the import (image / typed / JSON) —
      // do not reuse the Generate panel's default count (e.g. 5).
      const created = Array.from({ length: variantCount }, (_, index) =>
        generateFromTemplate(
          read.template,
          {
            count: 1,
            locale,
          },
          { pinVariant: true, variantIndex: index },
        ),
      ).flat();
      if (created.length === 0) {
        const status = classifyTemplateGenerateFilter(read.template, {});
        setNotice(status === 'no_match' ? copy.familyCenter.noMatchGenerate : copy.familyCenter.emptyGenerate);
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
    const issues = auditImportJson(jsonText);
    if (issues.length > 0) {
      setAuditIssues(issues);
      return;
    }
    setAuditIssues([]);
    const read = readTemplateJson(jsonText);
    if (!read.ok) {
      setNotice(family.invalidTemplate);
      return;
    }
    setSavingFamily(true);
    try {
      const result = await saveFamilyAction({ json: jsonText });
      if (!result.ok) {
        if (result.issues && result.issues.length > 0) {
          setAuditIssues(result.issues);
          return;
        }
        setNotice(
          result.error === 'unauthorized'
            ? family.errorUnauthorized
            : result.error === 'slug_taken'
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
    } catch {
      setCasOk(false);
      setCasNotice(family.invalidJson);
    }
  }

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
          className="pointer-events-auto flex max-h-full w-full max-w-2xl min-h-0 flex-col overflow-hidden rounded-2xl border border-hairline bg-white shadow-lg shadow-navy/10">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-5">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
              {family.title}
            </h2>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-paper hover:text-navy"
              aria-label={family.close}
              onClick={onClose}>
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="mt-4 space-y-3">
              {source === 'screenshot' || source === 'handwriting' ? (
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
                      event.target.value = '';
                    }}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={family.photoDropLabel}
                    className={[
                      'rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors',
                      dropActive ? 'border-navy bg-navy-tint/60' : 'border-hairline bg-paper hover:border-navy/40',
                      busy ? 'pointer-events-none opacity-60' : '',
                    ].join(' ')}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setDropActive(true);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'copy';
                      setDropActive(true);
                    }}
                    onDragLeave={(event) => {
                      if (event.currentTarget.contains(event.relatedTarget as Node)) {
                        return;
                      }
                      setDropActive(false);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDropActive(false);
                      const file = imageFileFromDataTransfer(event.dataTransfer);
                      if (file) void onImageFile(file);
                      else setNotice(family.badImage);
                    }}
                    onPaste={(event) => {
                      const file = imageFileFromDataTransfer(event.clipboardData);
                      if (!file) return;
                      event.preventDefault();
                      void onImageFile(file);
                    }}>
                    <div className="mb-3 flex justify-center">
                      <span className="flex size-12 items-center justify-center rounded-2xl bg-navy-tint text-navy">
                        <Image className="size-6" aria-hidden="true" />
                      </span>
                    </div>
                    <p className="text-sm font-medium text-ink">{family.photoDropLabel}</p>
                  </div>
                  {fileName ? <p className="text-xs text-ink">{fileName}</p> : null}
                  {busy ? <p className="text-sm text-body">{family.building}</p> : null}
                </>
              ) : null}
              {notice ? <p className="text-sm text-brass-strong">{notice}</p> : null}
              {auditIssues.length > 0 ? <AuditPanel copy={family} issues={auditIssues} /> : null}
              {jsonText ? (
                <>
                  {preview?.problem ? (
                    <div className="rounded-2xl border border-hairline bg-paper p-3">
                      <p className="text-xs font-semibold tracking-wide text-brass">{family.preview}</p>
                      <div className="mt-2 text-ink">
                        <KatexPreview tex={preview.problem.promptTex} />
                      </div>
                    </div>
                  ) : preview?.diagnosis ? (
                    <DiagnosisPanel copy={family} diagnosis={preview.diagnosis} />
                  ) : null}
                  {casNotice ? (
                    <p className={casOk ? 'text-sm text-navy' : 'text-sm text-brass-strong'}>{casNotice}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-navy/20 bg-white px-4 py-2 text-sm font-semibold text-navy shadow-sm hover:border-navy/40 hover:bg-navy-tint disabled:opacity-60"
                      disabled={Boolean(preview?.diagnosis) || !preview?.problem}
                      onClick={checkPreviewCas}>
                      {family.checkCas}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-strong disabled:opacity-60"
                      disabled={Boolean(preview?.diagnosis) || !preview?.problem}
                      onClick={buildProblems}>
                      {family.build}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-navy/20 bg-white px-4 py-2 text-sm font-semibold text-navy shadow-sm hover:border-navy/40 hover:bg-navy-tint disabled:opacity-60"
                      disabled={
                        Boolean(preview?.diagnosis) || !preview?.problem || auditIssues.length > 0 || savingFamily
                      }
                      onClick={() => void saveFamily()}>
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
