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
 */
export function repairPromptTex(tex: string) {
  const normalized = tex
    .replace(/\r\n/g, "\n")
    .replace(/\\\s+([()[\]])/g, "\\$1");
  return closeMathBeforeProse(normalized);
}

/** Student-facing TeX: `4k * k` → `4k^{2}`, never math.js asterisks. */
export function polishStudentTex(tex: string) {
  const withMath = repairPromptTex(tex).replace(
    /\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$|\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g,
    (full, display, inline, paren, bracket) => {
      const inner = display ?? inline ?? paren ?? bracket ?? "";
      const polished = polishMathJs(inner);
      if (display !== undefined || bracket !== undefined) return `$$${polished}$$`;
      return `$${polished}$`;
    },
  );
  return tidySignedTex(wrapBareMathJs(withMath));
}
