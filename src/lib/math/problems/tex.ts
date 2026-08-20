/** Build a signed polynomial term: 3x^2, -x, + 5 */
export function polyTerm(
  coef: number,
  variable: string,
  isLead: boolean,
): string {
  if (coef === 0) return "";

  const abs = Math.abs(coef);
  let body: string;
  if (!variable) body = String(abs);
  else if (abs === 1) body = variable;
  else body = `${abs}${variable}`;

  if (isLead) return coef < 0 ? `-${body}` : body;
  return `${coef < 0 ? "-" : "+"} ${body}`;
}

export function joinTex(...parts: string[]) {
  return parts.filter(Boolean).join(" ").replace(/^\+ /, "");
}

export function formatLinearTex(a: number, b: number, variable = "x") {
  return joinTex(polyTerm(a, variable, true), polyTerm(b, "", a === 0));
}

export function formatQuadraticTex(
  a: number,
  b: number,
  c: number,
  variable = "x",
) {
  return joinTex(
    polyTerm(a, `${variable}^2`, true),
    polyTerm(b, variable, a === 0),
    polyTerm(c, "", a === 0 && b === 0),
  );
}

export function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}

/** Collapse `+{-7}x` / `+-12x` into normal signed terms. */
export function tidySignedTex(tex: string) {
  return tex
    .replace(/\+\s*\{-(\d+(?:\.\d+)?)\}/g, "-$1")
    .replace(/\{-(\d+(?:\.\d+)?)\}/g, "-$1")
    .replace(/\+\s*-/g, "-")
    .replace(/-\s*-/g, "+")
    .replace(/\+\s*\+/g, "+")
    .replace(/-\s*\+/g, "-");
}

function polishMathJs(math: string) {
  let s = math.replace(/\s+/g, " ").trim();
  s = s.replace(/(\d+)\s*\*\s*([A-Za-z])\s*\*\s*\2\b/g, "$1$2^{2}");
  s = s.replace(/(\d+)([A-Za-z])\s*\*\s*\2\b/g, "$1$2^{2}");
  s = s.replace(/\b([A-Za-z])\s*\*\s*\1\b/g, "$1^{2}");
  s = s.replace(/\^(?!\{)(\d+)/g, "^{$1}");
  s = s.replace(/(\d+)\s*\*\s*([A-Za-z(])/g, "$1$2");
  s = s.replace(/([A-Za-z])\s*\*\s*\(/g, "$1(");
  s = s.replace(/\)\s*\*\s*([A-Za-z])/g, ")$1");
  s = s.replace(/\)\s*\*\s*\(/g, ")(");
  s = s.replace(/\b([A-Za-z])\s*\*\s*([A-Za-z])/g, "$1$2");
  s = s.replace(/(\d+)\s*\*\s*(\d+)/g, "$1 \\times $2");
  s = s.replace(/\s*\*\s*/g, " \\cdot ");
  return s.replace(/ {2,}/g, " ").trim();
}

function wrapBareMathJs(tex: string) {
  if (!/\*/.test(tex)) return tex;
  return tex.replace(
    /(?<!\$)(\d*[A-Za-z](?:\s*\*\s*\d*[A-Za-z0-9()^]+)+(?:\s*[+\-]\s*\d*[A-Za-z0-9()^]*)*(?:\s*=\s*[-+]?\d+)?)(?!\$)/g,
    (chunk) => `$${polishMathJs(chunk)}$`,
  );
}

const PROSE_LEAK =
  /(?<!\\)[\p{L}]{3,}(?:[\s,.:;]+[\p{L}]{2,})+/u;
const STRAY_GREEK =
  /^\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|phi|chi|psi|omega|circ|deg|ell|vec|angle)(?![A-Za-z])/;

function closeMathBeforeProse(source: string): string {
  let out = "";
  let i = 0;
  type Mode = "text" | "inline" | "display" | "paren" | "bracket";
  let mode: Mode = "text";

  const hitProse = () => PROSE_LEAK.exec(source.slice(i));

  while (i < source.length) {
    if (mode === "text") {
      if (source.startsWith("$$", i)) {
        mode = "display";
        out += "$$";
        i += 2;
        continue;
      }
      if (source.startsWith("\\[", i)) {
        mode = "bracket";
        out += "\\[";
        i += 2;
        continue;
      }
      if (source.startsWith("\\(", i)) {
        mode = "paren";
        out += "\\(";
        i += 2;
        continue;
      }
      if (source[i] === "$") {
        mode = "inline";
        out += "$";
        i += 1;
        continue;
      }
      const greek = STRAY_GREEK.exec(source.slice(i));
      if (greek) {
        let end = i + greek[0].length;
        const rest = source.slice(end);
        const assign = rest.match(/^\s*=\s*[^$\\]{1,48}/);
        if (assign) end += assign[0].length;
        out += `$${source.slice(i, end).trim()}$`;
        i = end;
        continue;
      }
      out += source[i]!;
      i += 1;
      continue;
    }

    const closer =
      mode === "inline"
        ? "$"
        : mode === "display"
          ? "$$"
          : mode === "paren"
            ? "\\)"
            : "\\]";
    if (source.startsWith(closer, i)) {
      out += closer;
      i += closer.length;
      mode = "text";
      continue;
    }

    const prose = hitProse();
    const nextClose = source.indexOf(closer, i);
    if (
      prose &&
      prose.index === 0 &&
      (nextClose < 0 || i < nextClose)
    ) {
      out += closer;
      mode = "text";
      continue;
    }
    if (
      (mode === "paren" || mode === "inline") &&
      /^\.\s+[\p{L}]/u.test(source.slice(i))
    ) {
      out += closer;
      mode = "text";
      continue;
    }

    out += source[i]!;
    i += 1;
  }

  if (mode === "inline") out += "$";
  else if (mode === "display") out += "$$";
  else if (mode === "paren") out += "\\)";
  else if (mode === "bracket") out += "\\]";
  return out;
}

/**
 * Fix leaked `$...$` / `\(` delimiters so Georgian prose is not painted as a
 * KaTeX error (red letters).
 *
 * Do NOT rewrite `\ (` → `\(` globally: that invents inline-math openers inside
 * `$$...$$` (e.g. after a thin space) and KaTeX then fails the whole formula.
 */
export function repairPromptTex(tex: string) {
  const normalized = tex.replace(/\r\n/g, "\n");
  return closeMathBeforeProse(normalized);
}

const SUPERSCRIPT_CHARS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  n: "ⁿ",
  i: "ⁱ",
  x: "ˣ",
  y: "ʸ",
};

export function toSuperscriptChars(value: string) {
  return [...value].map((char) => SUPERSCRIPT_CHARS[char] ?? char).join("");
}

function applySuperscriptCarets(text: string) {
  return text
    .replace(/\^\{([^}]+)\}/g, (_, exponent: string) => toSuperscriptChars(exponent))
    .replace(/\^(\d+)/g, (_, exponent: string) => toSuperscriptChars(exponent))
    .replace(/\^\{\\circ\}/g, "°")
    .replace(/\^\\circ\b/g, "°");
}

function stackFraction(numerator: string, denominator: string) {
  const num = numerator.trim();
  const den = denominator.trim();
  const width = Math.max(num.length, den.length, 3);
  const line = "─".repeat(width);
  const numPad = num.padStart(Math.floor((width + num.length) / 2)).padEnd(width);
  const denPad = den.padStart(Math.floor((width + den.length) / 2)).padEnd(width);
  return `${numPad.trimEnd()}\n${line}\n${denPad.trimEnd()}`;
}

function replaceStackedFractions(text: string) {
  return text
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, (_, numerator: string, denominator: string) =>
      stackFraction(
        applySuperscriptCarets(numerator.replace(/[{}]/g, "")),
        applySuperscriptCarets(denominator.replace(/[{}]/g, "")),
      ),
    )
    .replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, (_, numerator: string, denominator: string) =>
      stackFraction(
        applySuperscriptCarets(numerator),
        applySuperscriptCarets(denominator),
      ),
    );
}

/**
 * Readable math for text inputs — unicode superscripts (a²) and stacked fractions
 * instead of LaTeX ($...$, a^2, (a)/(b)).
 */
export function formatMathForReading(tex: string, options?: { trim?: boolean }) {
  const shouldTrim = options?.trim !== false;
  let s = tex.replace(/\r\n/g, "\n");
  if (shouldTrim) s = s.trim();

  s = s.replace(/\$\$([\s\S]+?)\$\$/g, "$1");
  s = s.replace(/\$([^$\n]+)\$/g, "$1");
  s = s.replace(/\\\[([\s\S]+?)\\\]/g, "$1");
  s = s.replace(/\\\(([\s\S]+?)\\\)/g, "$1");

  s = replaceStackedFractions(s);

  s = s.replace(/\\sqrt\{([^}]*)\}/g, (_, inner: string) => {
    const value = applySuperscriptCarets(inner.trim().replace(/[{}]/g, ""));
    return /^[\dA-Za-z]+$/.test(value) ? `√${value}` : `√(${value})`;
  });
  s = s.replace(/\\sqrt\s+(\d+)/g, "√$1");
  s = s.replace(/\\circ\b/g, "°");
  s = s.replace(/\\cdot/g, "·");
  s = s.replace(/\\times/g, "×");
  s = s.replace(/\\leq/g, "≤");
  s = s.replace(/\\geq/g, "≥");
  s = s.replace(/\\neq/g, "≠");
  s = s.replace(/\\pm/g, "±");
  s = s.replace(/\\left\b/g, "");
  s = s.replace(/\\right\b/g, "");
  s = s.replace(/\\,/g, " ");
  s = s.replace(/\\;/g, " ");
  s = s.replace(/\\quad\b/g, " ");
  s = s.replace(/\\text\{([^}]*)\}/g, "$1");
  s = s.replace(/\\mathrm\{([^}]*)\}/g, "$1");
  s = s.replace(/_\{([^}]*)\}/g, "_$1");

  s = applySuperscriptCarets(s);
  s = s.replace(/[{}]/g, "");

  const result = s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
  return shouldTrim ? result.trim() : result;
}

/** @deprecated Prefer formatMathForReading */
export function texToPlainText(tex: string, options?: { trim?: boolean }) {
  return formatMathForReading(tex, options);
}

const SUPER_DIGIT: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁺": "+",
  "⁻": "-",
  "⁼": "=",
  "⁽": "(",
  "⁾": ")",
  "ⁿ": "n",
  "ⁱ": "i",
  "ˣ": "x",
  "ʸ": "y",
};

const SUB_DIGIT: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
  "₊": "+",
  "₋": "-",
  "₌": "=",
  "₍": "(",
  "₎": ")",
};

/**
 * Turn pasted / readable unicode math into KaTeX-friendly `$...$` so the live
 * preview can show real superscripts and stacked fractions.
 */
export function toKatexFriendlyTex(text: string) {
  let s = text.replace(/\r\n/g, "\n");

  s = s.replace(/([A-Za-z0-9)])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱˣʸ]+)/g, (_, base: string, supers: string) => {
    const exponent = [...supers].map((char) => SUPER_DIGIT[char] ?? char).join("");
    return `${base}^{${exponent}}`;
  });
  s = s.replace(/([A-Za-z0-9)])([₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+)/g, (_, base: string, subs: string) => {
    const index = [...subs].map((char) => SUB_DIGIT[char] ?? char).join("");
    return `${base}_{${index}}`;
  });

  // Even when some `$...$` already exist, wrap bare TeX lines that would
  // otherwise show as raw `\left`, `\mathbb`, … in the preview.
  s = wrapBareTexLines(s);

  if (/\$|\\\(|\\\[/.test(s)) return s;

  // Wrap likely inline formulas so mixed Georgian/English prose still previews.
  return s.replace(
    /(?<![\p{L}\d$])((?:\\[a-zA-Z]+(?:\{[^}]*\})*|[A-Za-z]\w*(?:\^\{[^}]+\}|\^\d+|_\{\d+\}|_\d+)?|\d+)(?:\s*[+\-=]\s*(?:\\[a-zA-Z]+(?:\{[^}]*\})*|[A-Za-z]\w*(?:\^\{[^}]+\}|\^\d+|_\{\d+\}|_\d+)?|\d+))*(?:\s*\/\s*(?:\\[a-zA-Z]+(?:\{[^}]*\})*|\([^)]+\)|[A-Za-z]\w*(?:\^\{[^}]+\}|\^\d+)?|\d+))?)/gu,
    (match) => {
      if (!/[\\^_/]|[+\-=]/.test(match) && !/\d/.test(match)) return match;
      if (/^[\p{L}\s]+$/u.test(match)) return match;
      return `$${match}$`;
    },
  );
}

/** Wrap undelimited lines that are clearly TeX so KatexPreview can render them. */
function wrapBareTexLines(text: string) {
  let mode: "text" | "display" | "inline" | "paren" | "bracket" = "text";
  const lines = text.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    let i = 0;
    let rebuilt = "";
    while (i < line.length) {
      if (mode === "text") {
        if (line.startsWith("$$", i)) {
          mode = "display";
          rebuilt += "$$";
          i += 2;
          continue;
        }
        if (line.startsWith("\\[", i)) {
          mode = "bracket";
          rebuilt += "\\[";
          i += 2;
          continue;
        }
        if (line.startsWith("\\(", i)) {
          mode = "paren";
          rebuilt += "\\(";
          i += 2;
          continue;
        }
        if (line[i] === "$") {
          mode = "inline";
          rebuilt += "$";
          i += 1;
          continue;
        }
        rebuilt += line[i]!;
        i += 1;
        continue;
      }

      const closer =
        mode === "inline"
          ? "$"
          : mode === "display"
            ? "$$"
            : mode === "paren"
              ? "\\)"
              : "\\]";
      if (line.startsWith(closer, i)) {
        rebuilt += closer;
        i += closer.length;
        mode = "text";
        continue;
      }
      rebuilt += line[i]!;
      i += 1;
    }

    const trimmed = rebuilt.trim();
    if (
      mode === "text" &&
      trimmed &&
      !/\$|\\\(|\\\[/.test(trimmed) &&
      /\\[a-zA-Z]+/.test(trimmed)
    ) {
      const display =
        /\\(left|right|frac|mathbb|mathcal|sum|int|prod|begin|binom)\b/.test(
          trimmed,
        ) || trimmed.length > 48;
      out.push(display ? `$$${trimmed}$$` : `$${trimmed}$`);
    } else {
      out.push(rebuilt);
    }
  }

  return out.join("\n");
}

/** Student-facing TeX: `4k * k` → `4k^{2}`, never math.js asterisks. */
export function polishStudentTex(tex: string) {
  const withMath = repairPromptTex(tex).replace(
    /\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$|\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g,
    (full, display, inline, paren, bracket) => {
      const inner = display ?? inline ?? paren ?? bracket ?? "";
      // `\ (` accidentally turned into `\(` is invalid inside math mode.
      const cleaned = inner.replace(/\\\((?=[\sA-Za-z0-9])/g, "(");
      const polished = polishMathJs(cleaned);
      if (display !== undefined || bracket !== undefined) return `$$${polished}$$`;
      return `$${polished}$`;
    },
  );
  return tidySignedTex(wrapBareMathJs(withMath));
}
