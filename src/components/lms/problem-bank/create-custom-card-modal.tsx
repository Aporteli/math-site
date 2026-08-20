"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { FlaskConical, PenLine, X } from "lucide-react";
import { KatexPreview } from "@/components/math/katex-preview";
import { SelectMenu } from "@/components/ui/select-menu";
import { handlePlainTextPaste } from "@/lib/helpers/plain-text-paste";
import {
  PROBLEM_DIFFICULTIES,
  PROBLEM_TOPICS,
  PROBLEM_YEARS,
  topicLabel,
  type BankProblem,
  type ProblemBankCopy,
  type ProblemDifficulty,
  type ProblemTopic,
  type ProblemYear,
} from "@/lib/math/problems";
import { toKatexFriendlyTex } from "@/lib/math/problems/tex";
import type { Locale } from "@/i18n/config";

const fieldClass =
  "w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15";

interface CreateCustomCardModalProps {
  locale: Locale;
  copy: ProblemBankCopy;
  showSaveToLab?: boolean;
  onClose: () => void;
  onSaveToBank: (problem: BankProblem) => Promise<boolean>;
  onSaveToLab?: (problem: BankProblem) => Promise<boolean>;
}

function buildSolutionTex(answer: string, explanation: string) {
  const a = answer.trim();
  const e = explanation.trim();
  if (a && e) return `${a}\n\n${e}`;
  if (a) return a;
  if (e) return e;
  return "—";
}

function MathFieldPreview({ label, tex }: { label: string; tex: string }) {
  if (!tex.trim()) return null;
  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-hairline-soft bg-paper px-3 py-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <KatexPreview
        tex={toKatexFriendlyTex(tex)}
        className="block min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink [&_.katex-display]:my-2 [&_.katex]:text-[1.05rem]"
      />
    </div>
  );
}

export function CreateCustomCardModal({
  copy,
  showSaveToLab = false,
  onClose,
  onSaveToBank,
  onSaveToLab,
}: CreateCustomCardModalProps) {
  const card = copy.customCard;
  const titleId = useId();
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState<ProblemDifficulty>("medium");
  const [topic, setTopic] = useState<ProblemTopic>("algebra");
  const [year, setYear] = useState<ProblemYear | "">("");
  const [busy, setBusy] = useState<"bank" | "lab" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  function buildDraft(): BankProblem | null {
    const promptTex = prompt.trim();
    if (!promptTex) {
      setNotice(card.errorEmptyPrompt);
      return null;
    }
    return {
      id: `custom-${Date.now()}`,
      templateId: "custom",
      topic,
      difficulty,
      ...(year ? { year } : {}),
      source: "custom",
      instructionId: "solve",
      promptTex,
      solutionTex: buildSolutionTex(answer, explanation),
    };
  }

  async function onSubmit(target: "bank" | "lab") {
    const draft = buildDraft();
    if (!draft) return;

    setBusy(target);
    setNotice(null);
    try {
      const save = target === "lab" ? onSaveToLab : onSaveToBank;
      if (!save) {
        setNotice(card.errorFailed);
        return;
      }
      const ok = await save(draft);
      if (ok) onClose();
      else setNotice(card.errorFailed);
    } catch {
      setNotice(card.errorFailed);
    } finally {
      setBusy(null);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <button
        type="button"
        className="absolute inset-0 bg-navy-strong/40 backdrop-blur-sm"
        aria-label={card.close}
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
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
              {card.title}
            </h2>
            <button
              type="button"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-paper hover:text-navy"
              aria-label={card.close}
              onClick={onClose}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex shrink-0 flex-col gap-3 border-b border-hairline px-4 py-3 sm:px-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="min-w-0">
                <label
                  className="block text-xs font-medium text-muted"
                  htmlFor={`${titleId}-topic`}
                >
                  {card.topic}
                </label>
                <SelectMenu
                  id={`${titleId}-topic`}
                  className="mt-1"
                  value={topic}
                  onChange={(value) => setTopic(value as ProblemTopic)}
                  options={PROBLEM_TOPICS.map((id) => ({
                    value: id,
                    label: topicLabel(copy.topics, id),
                  }))}
                />
              </div>
              <div className="min-w-0">
                <label
                  className="block text-xs font-medium text-muted"
                  htmlFor={`${titleId}-difficulty`}
                >
                  {card.difficulty}
                </label>
                <SelectMenu
                  id={`${titleId}-difficulty`}
                  className="mt-1"
                  value={difficulty}
                  onChange={(value) => setDifficulty(value as ProblemDifficulty)}
                  options={PROBLEM_DIFFICULTIES.map((id) => ({
                    value: id,
                    label: copy.difficulties[id],
                  }))}
                />
              </div>
              <div className="min-w-0">
                <label
                  className="block text-xs font-medium text-muted"
                  htmlFor={`${titleId}-year`}
                >
                  {card.year}
                </label>
                <SelectMenu
                  id={`${titleId}-year`}
                  className="mt-1"
                  value={year}
                  onChange={(value) => setYear(value as ProblemYear | "")}
                  options={[
                    { value: "", label: card.noYear },
                    ...PROBLEM_YEARS.map((id) => ({
                      value: id,
                      label: copy.years[id],
                    })),
                  ]}
                />
              </div>
              <div className="flex min-w-0 items-end">
                <span className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-brass/20 bg-brass-tint px-3 text-xs font-semibold text-brass">
                  {copy.sources.custom}
                </span>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            <div>
              <label className="block text-sm font-medium text-ink" htmlFor={`${titleId}-prompt`}>
                {card.promptLabel}
              </label>
              <textarea
                id={`${titleId}-prompt`}
                className={`${fieldClass} mt-1.5 min-h-[8rem] resize-y font-sans`}
                value={prompt}
                maxLength={4000}
                placeholder={card.promptPlaceholder}
                onChange={(event) => setPrompt(event.target.value)}
                onPaste={(event) =>
                  handlePlainTextPaste(event, prompt, setPrompt, 4000, "katex")
                }
              />
            </div>
            <MathFieldPreview label={copy.chat.previewLabel} tex={prompt} />

            <div>
              <label className="block text-sm font-medium text-ink" htmlFor={`${titleId}-answer`}>
                {card.answerLabel}
              </label>
              <textarea
                id={`${titleId}-answer`}
                className={`${fieldClass} mt-1.5 min-h-[4.5rem] resize-y font-sans`}
                value={answer}
                maxLength={2000}
                placeholder={card.answerPlaceholder}
                onChange={(event) => setAnswer(event.target.value)}
                onPaste={(event) =>
                  handlePlainTextPaste(event, answer, setAnswer, 2000, "katex")
                }
              />
            </div>
            <MathFieldPreview label={card.answerPreviewLabel} tex={answer} />

            <div>
              <label
                className="block text-sm font-medium text-ink"
                htmlFor={`${titleId}-explanation`}
              >
                {card.explanationLabel}
              </label>
              <textarea
                id={`${titleId}-explanation`}
                className={`${fieldClass} mt-1.5 min-h-[7rem] resize-y font-sans`}
                value={explanation}
                maxLength={8000}
                placeholder={card.explanationPlaceholder}
                onChange={(event) => setExplanation(event.target.value)}
                onPaste={(event) =>
                  handlePlainTextPaste(
                    event,
                    explanation,
                    setExplanation,
                    8000,
                    "katex",
                  )
                }
              />
            </div>
            <MathFieldPreview label={card.explanationPreviewLabel} tex={explanation} />
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-hairline px-4 py-4 sm:px-5">
            {notice ? (
              <p className="text-sm text-brass-strong">{notice}</p>
            ) : null}
            <div className="flex flex-nowrap items-center justify-end gap-2 overflow-x-auto hide-scrollbar">
              <button
                type="button"
                disabled={busy !== null || !prompt.trim()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-navy/20 bg-white px-4 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-navy-tint disabled:opacity-60"
                onClick={() => void onSubmit("bank")}
              >
                <PenLine className="size-4" aria-hidden="true" />
                {busy === "bank" ? card.saving : card.save}
              </button>
              {showSaveToLab && onSaveToLab ? (
                <button
                  type="button"
                  disabled={busy !== null || !prompt.trim()}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-strong disabled:opacity-60"
                  onClick={() => void onSubmit("lab")}
                >
                  <FlaskConical className="size-4" aria-hidden="true" />
                  {busy === "lab" ? card.savingLab : card.saveToLab}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
