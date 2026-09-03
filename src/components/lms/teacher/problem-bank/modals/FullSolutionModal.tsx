'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Copy, Printer, X } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import { topicLabel, type BankProblem, type ProblemBankCopy } from '@/lib/math/problems';

interface FullSolutionModalProps {
  copy: ProblemBankCopy;
  problem: BankProblem;
  problems: BankProblem[];
  onClose: () => void;
  onSelect: (problemId: string) => void;
}

export function FullSolutionModal({ copy, problem, problems, onClose, onSelect }: FullSolutionModalProps) {
  const ui = copy.fullSolution;
  const titleId = useId();
  const printRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const index = problems.findIndex((item) => item.id === problem.id);
  const hasPrev = index > 0;
  const hasNext = index >= 0 && index < problems.length - 1;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && hasPrev) {
        onSelect(problems[index - 1]!.id);
      }
      if (event.key === 'ArrowRight' && hasNext) {
        onSelect(problems[index + 1]!.id);
      }
    }
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [hasNext, hasPrev, index, onClose, onSelect, problems]);

  async function onCopy() {
    const text = [problem.promptTex, '', copy.solution, problem.solutionTex].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  function onPrint() {
    const node = printRef.current;
    if (!node) return;

    // Do not pass noopener/noreferrer — both make window.open() return null,
    // so we could never write the document or call print().
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;

    win.opener = null;

    const katexCss = [...document.querySelectorAll('link[href*="katex"]')]
      .map((link) => (link as HTMLLinkElement).href)
      .filter(Boolean);
    const styles = katexCss.map((href) => `<link rel="stylesheet" href="${href}" />`).join('\n');
    const safeTitle = ui.printTitle
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');

    win.document.open();
    win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
${styles}
<style>
  body { font-family: Georgia, "Times New Roman", serif; color: #16233a; padding: 24px; line-height: 1.5; }
  h1 { font-size: 1.1rem; margin: 0 0 8px; }
  h2 { font-size: 0.85rem; letter-spacing: 0.04em; text-transform: uppercase; color: #7b8494; margin: 20px 0 8px; }
  .meta { color: #7b8494; font-size: 0.85rem; margin-bottom: 16px; }
  .block { white-space: pre-wrap; word-break: break-word; }
</style>
</head>
<body>${node.innerHTML}</body>
</html>`);
    win.document.close();
    win.focus();

    let printed = false;
    const triggerPrint = () => {
      if (printed) return;
      printed = true;
      try {
        win.print();
      } finally {
        window.setTimeout(() => {
          try {
            win.close();
          } catch {
            /* ignore */
          }
        }, 300);
      }
    };

    // Wait for KaTeX CSS (and fonts) so formulas render before the print dialog.
    const links = [...win.document.querySelectorAll('link[rel="stylesheet"]')];
    if (links.length === 0) {
      window.setTimeout(triggerPrint, 100);
      return;
    }

    let remaining = links.length;
    const done = () => {
      remaining -= 1;
      if (remaining <= 0) triggerPrint();
    };
    for (const link of links) {
      link.addEventListener('load', done);
      link.addEventListener('error', done);
    }
    window.setTimeout(triggerPrint, 1500);
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden print:static print:z-auto">
      <button
        type="button"
        className="absolute inset-0 bg-navy-strong/40 backdrop-blur-sm print:hidden"
        aria-label={ui.close}
        onClick={onClose}
      />
      <div className="pointer-events-none relative z-10 flex h-full items-center justify-center p-4 sm:p-6 print:p-0">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="pointer-events-auto flex max-h-full w-full max-w-3xl min-h-0 flex-col overflow-hidden rounded-2xl border border-hairline bg-white shadow-lg shadow-navy/10 print:max-h-none print:max-w-none print:rounded-none print:border-0 print:shadow-none">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-5 print:hidden">
            <div>
              <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
                {ui.title}
              </h2>
              <p className="mt-1 text-sm text-muted">{index >= 0 ? `${index + 1} / ${problems.length}` : null}</p>
            </div>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-paper hover:text-navy"
              aria-label={ui.close}
              onClick={onClose}>
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <div ref={printRef}>
              <h1 className="text-base font-semibold text-ink">{copy.instructions[problem.instructionId]}</h1>
              <p className="meta mt-1 text-xs text-muted">
                {topicLabel(copy.topics, problem.topic)}
                <span aria-hidden="true"> · </span>
                {copy.difficulties[problem.difficulty]}
                {problem.year ? (
                  <>
                    <span aria-hidden="true"> · </span>
                    {copy.years[problem.year]}
                  </>
                ) : null}
              </p>

              <h2 className="mt-5 text-xs font-semibold uppercase tracking-wide text-brass">{copy.prompt}</h2>
              <div className="mt-2 min-w-0 overflow-x-auto rounded-xl bg-paper-deep px-4 py-4">
                <KatexPreview
                  tex={problem.promptTex}
                  className="block whitespace-pre-wrap break-words text-ink [&_.katex-display]:my-2"
                />
              </div>

              <h2 className="mt-5 text-xs font-semibold uppercase tracking-wide text-brass">{copy.solution}</h2>
              <div className="mt-2 min-w-0 overflow-x-auto rounded-xl border border-hairline bg-white px-4 py-4">
                <KatexPreview
                  tex={problem.solutionTex}
                  className="block whitespace-pre-wrap break-words text-ink [&_.katex-display]:my-2 [&_.katex]:text-[1.05rem]"
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-hairline px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5 print:hidden">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                disabled={!hasPrev}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm font-semibold text-navy hover:border-navy/30 hover:bg-navy-tint disabled:opacity-40"
                onClick={() => onSelect(problems[index - 1]!.id)}>
                <ChevronLeft className="size-4" aria-hidden="true" />
                {ui.previous}
              </button>
              <button
                type="button"
                disabled={!hasNext}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm font-semibold text-navy hover:border-navy/30 hover:bg-navy-tint disabled:opacity-40"
                onClick={() => onSelect(problems[index + 1]!.id)}>
                {ui.next}
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm font-semibold text-navy hover:border-navy/30 hover:bg-navy-tint sm:w-auto"
                onClick={() => void onCopy()}>
                <Copy className="size-4" aria-hidden="true" />
                {copied ? ui.copied : ui.copy}
              </button>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm font-semibold text-navy hover:border-navy/30 hover:bg-navy-tint sm:w-auto"
                onClick={onPrint}>
                <Printer className="size-4" aria-hidden="true" />
                {ui.print}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,

    document.body,
  );
}
