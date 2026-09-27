'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { polishStudentTex } from '@/lib/math/problems/tex';

type Segment = { type: 'text'; value: string } | { type: 'math'; value: string; display: boolean };

/* ──────────────────────────────────────────────────────────────
 * Unicode → LaTeX conversion
 * ────────────────────────────────────────────────────────────── */

const UNICODE_TO_LATEX: Record<string, string> = {
  α: '\\alpha ',
  β: '\\beta ',
  γ: '\\gamma ',
  δ: '\\delta ',
  ε: '\\epsilon ',
  ζ: '\\zeta ',
  η: '\\eta ',
  θ: '\\theta ',
  ι: '\\iota ',
  κ: '\\kappa ',
  λ: '\\lambda ',
  μ: '\\mu ',
  ν: '\\nu ',
  ξ: '\\xi ',
  π: '\\pi ',
  ρ: '\\rho ',
  σ: '\\sigma ',
  τ: '\\tau ',
  υ: '\\upsilon ',
  φ: '\\phi ',
  χ: '\\chi ',
  ψ: '\\psi ',
  ω: '\\omega ',
  Γ: '\\Gamma ',
  Δ: '\\Delta ',
  Θ: '\\Theta ',
  Λ: '\\Lambda ',
  Ξ: '\\Xi ',
  Π: '\\Pi ',
  Σ: '\\Sigma ',
  Φ: '\\Phi ',
  Ψ: '\\Psi ',
  Ω: '\\Omega ',
  '√': '\\sqrt ',
  '∞': '\\infty ',
  '≤': '\\le ',
  '≥': '\\ge ',
  '≠': '\\ne ',
  '≈': '\\approx ',
  '±': '\\pm ',
  '∓': '\\mp ',
  '×': '\\times ',
  '÷': '\\div ',
  '·': '\\cdot ',
  '⋅': '\\cdot ',
  '→': '\\to ',
  '←': '\\leftarrow ',
  '⇒': '\\Rightarrow ',
  '⇔': '\\Leftrightarrow ',
  '∑': '\\sum ',
  '∏': '\\prod ',
  '∫': '\\int ',
  '∂': '\\partial ',
  '∇': '\\nabla ',
  '∈': '\\in ',
  '∉': '\\notin ',
  '⊂': '\\subset ',
  '⊆': '\\subseteq ',
  '∪': '\\cup ',
  '∩': '\\cap ',
  '∅': '\\emptyset ',
  '∀': '\\forall ',
  '∃': '\\exists ',
  '¬': '\\neg ',
  '∧': '\\land ',
  '∨': '\\lor ',
  ℝ: '\\mathbb{R} ',
  ℕ: '\\mathbb{N} ',
  ℤ: '\\mathbb{Z} ',
  ℚ: '\\mathbb{Q} ',
  ℂ: '\\mathbb{C} ',
};

function unicodeToLatex(tex: string): string {
  let result = tex;
  for (const [uni, latex] of Object.entries(UNICODE_TO_LATEX)) {
    result = result.split(uni).join(latex);
  }
  return result;
}

/* ────────────────────────────────────────────────────────────── */

function splitMathSegments(input: string): Segment[] {
  const segments: Segment[] = [];
  const pattern = /\$\$([\s\S]+?)\$\$|\$([^$\n]+)\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input))) {
    if (match.index > last) {
      segments.push({ type: 'text', value: input.slice(last, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: 'math', value: match[1], display: true });
    } else if (match[2] !== undefined) {
      segments.push({ type: 'math', value: match[2], display: false });
    } else if (match[3] !== undefined) {
      segments.push({ type: 'math', value: match[3], display: false });
    } else if (match[4] !== undefined) {
      segments.push({ type: 'math', value: match[4], display: true });
    }
    last = match.index + match[0].length;
  }

  if (last < input.length) {
    segments.push({ type: 'text', value: input.slice(last) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: input }];
}

function peelProseFromMath(segment: Segment): Segment[] {
  if (segment.type !== 'math') return [segment];
  const leak = /(?<!\\)[\p{L}]{3,}(?:\s+[\p{L}]{2,})+/u.exec(segment.value);
  if (!leak) return [segment];
  const mathPart = segment.value.slice(0, leak.index).trimEnd();
  const textPart = segment.value.slice(leak.index);
  const parts: Segment[] = [];
  if (mathPart) {
    parts.push({ type: 'math', value: mathPart, display: segment.display });
  }
  if (textPart) parts.push({ type: 'text', value: textPart });
  return parts.length > 0 ? parts : [segment];
}

function looksLikeProse(tex: string) {
  if (/\$|\\\(|\\\[/.test(tex)) return true;

  // If it has any LaTeX command, treat as math
  if (/\\[a-zA-Z]+/.test(tex) || /[_^]\{/.test(tex)) return false;

  if (/[^\u0000-\u007f]/u.test(tex) && /\p{L}/u.test(tex)) return true;

  if (tex.length > 400 && /[\p{L}]{3,}/u.test(tex)) return true;

  if (/[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(tex)) return true;

  return /[\p{L}]{2,}\s+[\p{L}]{2,}/u.test(tex);
}

function renderKatex(tex: string, node: HTMLElement, displayMode: boolean) {
  try {
    katex.render(tex, node, {
      throwOnError: false,
      displayMode,
      errorColor: 'currentColor',
      strict: false,
      trust: true,
      output: 'html',
    });
    const katexEl = node.querySelector('.katex') as HTMLElement | null;
    if (katexEl) {
      katexEl.style.display = 'inline-block';
      katexEl.style.whiteSpace = 'nowrap';
      katexEl.style.maxWidth = '100%';
    }
  } catch {
    node.textContent = tex;
  }
}

export function KatexPreview({
  tex,
  className = '',
  displayMode = false,
}: {
  tex: string;
  className?: string;
  displayMode?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.replaceChildren();

    const unicodeFixed = unicodeToLatex(tex);

    // ══════════════════════════════════════════════════════════════
    //  FAST PATH — original tex is already pure LaTeX
    //
    //  Detect BEFORE polishStudentTex, because that function may
    //  wrap single symbols in $...$ (e.g. \pi → $\pi$), which then
    //  breaks looksLikeProse and causes the string to be split.
    // ══════════════════════════════════════════════════════════════
    if (!looksLikeProse(unicodeFixed)) {
      renderKatex(
        unicodeFixed
          .replace(/\\text\{([^{}]*)\}/g, '$1')
          .replace(/\\mathrm\{([^{}]*)\}/g, '$1'),
        node,
        displayMode,
      );
      return;
    }

    // ══════════════════════════════════════════════════════════════
    //  SLOW PATH — mixed prose + math
    // ══════════════════════════════════════════════════════════════
    const prepared = unicodeToLatex(
      polishStudentTex(tex)
        .replace(/\\text\{([^{}]*)\}/g, '$1')
        .replace(/\\mathrm\{([^{}]*)\}/g, '$1'),
    );

    if (!looksLikeProse(prepared)) {
      renderKatex(prepared, node, displayMode);
      return;
    }

    const segments = splitMathSegments(prepared).flatMap(peelProseFromMath);
    const onlyMath = segments.length === 1 && segments[0]?.type === 'math' ? segments[0] : null;
    if (onlyMath) {
      renderKatex(onlyMath.value, node, displayMode || onlyMath.display);
      return;
    }

    for (const segment of segments) {
      if (segment.type === 'text') {
        const text = document.createElement('span');
        text.className = 'whitespace-pre-wrap';
        text.textContent = segment.value;
        node.appendChild(text);
        continue;
      }

      const math = document.createElement('span');
      math.className = segment.display ? 'block my-2 overflow-x-auto hide-scrollbar' : 'inline-block';
      math.style.whiteSpace = 'nowrap';
      math.style.maxWidth = '100%';
      renderKatex(segment.value, math, segment.display);
      node.appendChild(math);
    }
  }, [tex, displayMode]);

  return <span ref={ref} className={className} />;
}