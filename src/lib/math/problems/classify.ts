import {
  PROBLEM_DIFFICULTIES,
  PROBLEM_TOPICS,
  PROBLEM_YEARS,
  type ProblemDifficulty,
  type ProblemInstructionId,
  type ProblemTopic,
  type ProblemYear,
} from "./types";

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "give",
  "make",
  "type",
  "types",
  "kind",
  "about",
  "some",
  "please",
  "problem",
  "problems",
  "different",
  "exact",
  "topic",
  "math",
  "maths",
  "school",
  "ამოცანა",
  "ამოცანები",
  "თემა",
  "задач",
  "задачи",
  "тема",
  "ძალიან",
  "რთული",
  "რთულ",
  "მარტივი",
  "მარტივ",
  "ადვილი",
  "საშუალო",
  "easy",
  "hard",
  "medium",
  "very",
  "simple",
  "прост",
  "сложн",
  "трудн",
  "лёгк",
  "легк",
  "очень",
  "средн",
]);

/** Request words (ka/ru/en) → math terms that appear in LaTeX or English slugs. */
const TOKEN_ALIASES: Record<string, string[]> = {
  კვადრატული: ["quadratic", "quadrat", "parabola", "x^2", "x^{2}"],
  კვადრატულ: ["quadratic", "quadrat", "parabola", "x^2", "x^{2}"],
  ფუნქცია: ["function", "f(x)", "f\\left"],
  ფუნქციის: ["function", "f(x)", "f\\left"],
  განტოლება: ["equation", "solve", "quadratic"],
  განტოლების: ["equation", "solve", "quadratic"],
  განტოლებებ: ["equation", "solve", "quadratic"],
  წარმოებული: ["derivative", "calculus"],
  პროცენტ: ["percent", "%"],
  გეომეტრია: ["geometry", "triangle"],
  კომბინატორიკა: ["combinator", "ncr", "binom"],
  квадратн: ["quadratic", "quadrat", "parabola", "x^2"],
  функц: ["function", "f(x)"],
  уравнен: ["equation", "solve"],
  производн: ["derivative", "calculus"],
};

function haystack(parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function slugifyTopic(raw: string) {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\u10a0-\u10ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "algebra";
}

export function requestTokens(request: string) {
  return request
    .toLowerCase()
    .split(/[^a-z0-9\u10a0-\u10ff]+/)
    .filter((token) => token.length >= 3 && !STOP.has(token));
}

function tokenMatchesHay(token: string, hay: string) {
  if (hay.includes(token)) return true;

  for (const [key, aliases] of Object.entries(TOKEN_ALIASES)) {
    if (token === key || token.startsWith(key) || key.startsWith(token)) {
      if (aliases.some((alias) => hay.includes(alias))) return true;
    }
  }

  return false;
}

export function draftFitsRequest(
  request: string,
  draft: {
    topic: string;
    kind: string;
    promptTex: string;
    formula?: string;
  },
) {
  const tokens = requestTokens(request);
  if (tokens.length === 0) return true;

  const hay = haystack([
    draft.topic.replaceAll("-", " "),
    draft.kind.replaceAll("-", " "),
    draft.promptTex,
    draft.formula,
  ]);

  return tokens.some((token) => tokenMatchesHay(token, hay));
}

export function topicFromRequest(request: string, proposed?: string) {
  if (proposed) {
    const slug = slugifyTopic(proposed);
    if (
      draftFitsRequest(request, {
        topic: slug,
        kind: slug,
        promptTex: proposed,
      })
    ) {
      return slug;
    }
  }

  const tokens = requestTokens(request);
  if (tokens.length > 0) {
    return slugifyTopic(tokens.slice(0, 4).join(" "));
  }

  return slugifyTopic(proposed || "algebra");
}

const COMBINATORICS_MATH =
  /\\binom|combinat|permut|factorial|\bn!|nCr|nPr|catalan|bellNumbers|stirlingS2|combinationsWithRep|\bcomposition\s*\(/i;

export function inferKnownTopic(input: {
  promptTex: string;
  formula?: string;
  kind?: string;
  instructionId: ProblemInstructionId;
}): ProblemTopic | null {
  const hay = haystack([input.promptTex, input.formula, input.kind]);

  if (COMBINATORICS_MATH.test(hay) || /combinator/.test(hay)) {
    return "combinatorics";
  }
  if (
    input.instructionId === "findDerivative" ||
    /derivative|\\frac\{\s*d\s*\}|d\/dx/.test(hay)
  ) {
    return "calculus";
  }
  if (input.instructionId === "percentOf" || /percent|%/.test(hay)) {
    return "percent";
  }
  if (
    input.instructionId === "missingSide" ||
    /pythag|\\triangle|\\angle|hypotenuse/.test(hay)
  ) {
    return "geometry";
  }
  if (
    /\\vec|\\langle|\\lVert|\\cdot|dot[-_ ]?product|cross[-_ ]?product/.test(
      hay,
    )
  ) {
    return "vectors";
  }
  if (/\bgcd\b|\blcm\b|\bmod\b|number[-_ ]theory|prime|divisib/.test(hay)) {
    return null;
  }
  if (/\bf\s*\(|function[-_ ]?(linear|quadratic)|graph/.test(hay)) {
    return "functions";
  }
  if (
    /\\sqrt|quadratic|x\^2|both[-_ ]?sides|equation/.test(hay) ||
    (input.instructionId === "solve" && hay.includes("="))
  ) {
    return "equations";
  }
  if (
    input.instructionId === "expand" ||
    input.instructionId === "factor" ||
    input.instructionId === "simplify" ||
    /factor|expand|simplify|linear[-_ ]?(one|two)[-_ ]?step/.test(hay)
  ) {
    return "algebra";
  }

  return null;
}

export function resolveTopic(
  request: string,
  proposed: string | undefined,
  hint: string | undefined,
): string {
  const fromModel = proposed ? slugifyTopic(proposed) : "";
  if (
    fromModel &&
    draftFitsRequest(request, {
      topic: fromModel,
      kind: fromModel,
      promptTex: fromModel,
    })
  ) {
    return fromModel;
  }

  if (hint && (PROBLEM_TOPICS as readonly string[]).includes(hint)) {
    return hint;
  }

  return topicFromRequest(request, proposed || hint);
}

export function difficultyFromRequest(
  request: string,
): ProblemDifficulty | undefined {
  const text = request.toLowerCase();
  if (
    /ოლიმპ|olympiad|olympic|олимпиад/.test(text)
  ) {
    return "olympiad";
  }
  if (
    /ძალიან\s*რთულ|very\s*hard|extremely\s*hard|очень\s*сложн|очень\s*трудн/.test(
      text,
    )
  ) {
    return "hard";
  }
  if (/\bhard\b|რთულ|ძნელ|сложн|трудн/.test(text)) return "hard";
  if (/\beasy\b|მარტივ|ადვილ|прост|лёгк|легк/.test(text)) return "easy";
  if (/\bmedium\b|საშუალო|средн/.test(text)) return "medium";
  return undefined;
}

export function resolveDifficulty(
  proposed: string | undefined,
  hint: ProblemDifficulty | undefined,
  request?: string,
): ProblemDifficulty {
  const fromRequest = request ? difficultyFromRequest(request) : undefined;
  if (fromRequest) return fromRequest;
  if (hint) return hint;
  if (
    proposed &&
    (PROBLEM_DIFFICULTIES as readonly string[]).includes(proposed)
  ) {
    return proposed as ProblemDifficulty;
  }
  return "medium";
}

function formulaCallCount(formula: string) {
  return formula.match(/[A-Za-z][A-Za-z0-9_]*\s*\(/g)?.length ?? 0;
}

function formulaOpCount(formula: string) {
  return formula.match(/[+\-*/^%,]/g)?.length ?? 0;
}

const SIMPLE_CLOSED =
  /^(discriminant|quadraticRootP|quadraticRootM|percentOf|lineAt|midpoint)\(/i;

/** Plug-in $ax^2+bx+c$ at a point — year-8, never "hard". */
function isQuadraticPlugIn(formula: string) {
  return /^[a-z]\*[a-z](\^2|\*\*[a-z2])/.test(formula) && formulaCallCount(formula) === 0;
}

function isVertexFormula(formula: string) {
  return /^-?[a-z]\/\(2\*?[a-z]\)$/.test(formula);
}

function isDiscriminantFormula(formula: string) {
  const compact = formula.replace(/\s+/g, "").toLowerCase();
  if (compact.startsWith("discriminant(")) return true;
  if (/^pow\([a-z],2\)-4\*[a-z]\*[a-z]$/.test(compact)) return true;
  return /^[a-z](\^2|\*[a-z])-4\*[a-z]\*[a-z]$/.test(compact);
}

/**
 * Math.js-check can only return one number, so "hard" means several
 * algebraic steps in the formula, not a one-plug helper.
 */
export function formulaMeetsDifficulty(
  formula: string,
  difficulty: ProblemDifficulty,
) {
  if (difficulty === "easy") return true;

  const compact = formula.replace(/\s+/g, "");
  const calls = formulaCallCount(compact);
  const ops = formulaOpCount(compact);
  const simpleClosed = SIMPLE_CLOSED.test(compact) && calls === 1;
  const discriminant = isDiscriminantFormula(compact);

  if (difficulty === "medium") {
    if (isQuadraticPlugIn(compact) || isVertexFormula(compact) || discriminant) {
      return true;
    }
    return ops >= 2 || calls >= 1;
  }

  if (
    simpleClosed ||
    discriminant ||
    isQuadraticPlugIn(compact) ||
    isVertexFormula(compact)
  ) {
    return false;
  }
  return calls >= 2 || ops >= 4;
}

export function resolveYear(
  proposed: string | undefined,
  hint: ProblemYear | undefined,
): ProblemYear {
  if (proposed && (PROBLEM_YEARS as readonly string[]).includes(proposed)) {
    return proposed as ProblemYear;
  }
  return hint ?? "9";
}

export function looksTooEasyForHard(promptTex: string) {
  const text = promptTex.toLowerCase();
  const compact = text.replace(/\s+/g, "");
  const hardMarkers =
    /parameter|\bfor which\b|\bk\b|t\s*=\s*x|x\+1\/x|1\/x|x_?1\^|nested|f\s*\(\s*f|positive roots|how many real|რა მნიშვნელობ|при каких|параметр|შეცვლ|ვიეტ/.test(
      text,
    ) || /f\(f\(/.test(compact);
  if (hardMarkers) return false;
  if (/discriminant|დისკრიმინანტ|дискриминант/.test(text)) return true;
  if (/f\s*\(\s*-?\d+\s*\)/.test(compact) && !/f\s*\(\s*f/.test(compact)) {
    return true;
  }
  if (
    /solve|იპოვე ფესვ|реши уравнен/.test(text) &&
    /x\^2|x\^{2}/.test(compact) &&
    !/[kλm]/.test(compact)
  ) {
    return true;
  }
  return false;
}

export function sanitizeProblemText(raw: string, max: number) {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, max);
}
