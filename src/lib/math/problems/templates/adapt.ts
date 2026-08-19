import {
  PROBLEM_DIFFICULTIES,
  PROBLEM_INSTRUCTIONS,
  PROBLEM_TOPICS,
  PROBLEM_YEARS,
  type ProblemDifficulty,
  type ProblemInstructionId,
  type ProblemTopic,
  type ProblemYear,
} from "../types";
import { FAMILY_VARIANT_MAX, problemTemplateSchema, type ProblemTemplate, type TemplateVariant } from "./schema";
import { closeParamIndexSlots } from "./slot-markup";
import {
  buildWorkRateFamily,
  relayAlphaHours,
  slotWorkRateStory,
  workRateHoursFromEquation,
} from "./work-rate";

const SLOT = /(?<!\{)\{([A-Za-z][A-Za-z0-9_]{0,23})\}(?!\})/g;

const LATEX_FN_BEFORE =
  /\\(?:sin|cos|tan|cot|sec|csc|sinh|cosh|tanh|ln|log|exp|det|dim|ker|tr|span|max|min|gcd|lg)\s*(?:\\left)?\s*$/;

const TOPIC_HINTS: [RegExp, ProblemTopic][] = [
  [
    /linear independ|წრფივად დამოკიდ|წრფივად დამოუკიდ|eigen|nilpotent|circulant|skew.?symmetr|lie algebra|krylov|lagrange interpol/i,
    "vectors",
  ],
  [/geometry|triangle|pythag|circle/i, "geometry"],
  [/percent/i, "percent"],
  [/calculus|derivative|integral/i, "calculus"],
  [/vector|subspace|span|kernel|null.?space|ქვესივრც/i, "vectors"],
  [/combinator/i, "combinatorics"],
  [/function/i, "functions"],
  [/განტოლ|уравнен|rational/i, "equations"],
  [
    /algebra|polynomial|vieta|quadratic|cubic|linear|sequence|series|progression|binomial/i,
    "algebra",
  ],
  [/equation/i, "equations"],
];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function expandSlots(text: string, names: Set<string>) {
  const keepDummyR = /T_\s*\{\s*r\s*\+\s*1\s*\}/.test(text);
  return text.replace(SLOT, (full, name: string, offset: number) => {
    if (!names.has(name)) return full;
    if (keepDummyR && name === "r") {
      const before = text.slice(0, offset).replace(/[\s$]+$/, "");
      if (!before.endsWith("=")) return full;
    }
    return `{{${name}}}`;
  });
}

/** Keep LaTeX grouping around imported {{name}} slots (\\frac{{c}} → \\frac{{{c}}}). */
function repairImportedTexSlots(text: string, names: Set<string>) {
  if (names.size === 0) return text;
  const has = (name: string) => names.has(name);
  let out = text;
  out = out.replace(
    /\^\{\{(\w+)\}(\s*-\s*3r)\}/g,
    (full, name: string, rest: string) =>
      has(name) ? `^{{{${name}}}${rest}}` : full,
  );
  out = out.replace(/\^\{\{(\w+)\}-/g, (full, name: string) =>
    has(name) ? `^{{{${name}}}-` : full,
  );
  out = out.replace(/\\frac\{\{(\w+)\}\}/g, (full, name: string) =>
    has(name) ? `\\frac{{{${name}}}}` : full,
  );
  out = out.replace(
    /\\binom\{\{(\w+)\}\}\{\{(\w+)\}\}/g,
    (full, a: string, b: string) =>
      has(a) && has(b) ? `\\binom{{{${a}}}}{{{${b}}}}` : full,
  );
  out = out.replace(/\\binom\{\{(\w+)\}\}\{r\}/g, (full, name: string) =>
    has(name) ? `\\binom{{{${name}}}}{r}` : full,
  );
  out = out.replace(/\^\{\{(\w+)\}\}(?![\w{])/g, (full, name: string) =>
    has(name) ? `^{{{${name}}}}` : full,
  );
  out = out.replace(/T_\{\{(\w+)\}\}/g, (full, name: string) =>
    has(name) ? `T_{{{${name}}}}` : full,
  );
  out = out.replace(
    /\{\{(\w+)\}\}\^\{\{(\w+)\}\}/g,
    (full, a: string, b: string) =>
      has(a) && has(b) ? `{{{${a}}}}^{{{${b}}}}` : full,
  );
  out = out.replace(
    /_\{+\s*([A-Za-z][A-Za-z0-9_]{0,23})\s*\}\s*\\times\s*\{+\s*([A-Za-z][A-Za-z0-9_]{0,23})\s*\}+/g,
    (full, a: string, b: string) =>
      has(a) && has(b) ? `_{{{${a}}} \\times {{${b}}}}` : full,
  );
  out = out.replace(
    /\{\{(\w+)\}\}\{\{(\w+)\}\}/g,
    (full, a: string, b: string) =>
      has(a) && has(b) ? `{{${a}}}\\cdot{{${b}}}` : full,
  );
  out = out.replace(/\\left\(\{\{(\w+)\}\}x/g, (full, name: string, offset: number) => {
    if (!has(name) || LATEX_FN_BEFORE.test(out.slice(0, offset))) return full;
    return `\\left({{{${name}}}}x`;
  });
  out = out.replace(/\(\{\{(\w+)\}\}x/g, (full, name: string, offset: number) => {
    if (!has(name) || LATEX_FN_BEFORE.test(out.slice(0, offset))) return full;
    return `({{{${name}}}}x`;
  });
  out = out.replace(/\\cdot \{\{(\w+)\}\}\^r/g, (full, name: string) =>
    has(name) ? `\\cdot {{{${name}}}}^r` : full,
  );
  return closeParamIndexSlots(out, names);
}

function mapTopic(value: unknown): ProblemTopic {
  if (typeof value === "string" && (PROBLEM_TOPICS as readonly string[]).includes(value)) {
    return value as ProblemTopic;
  }
  const text = typeof value === "string" ? value : "";
  for (const [pattern, topic] of TOPIC_HINTS) {
    if (pattern.test(text)) return topic;
  }
  return "algebra";
}

function mapDifficulty(value: unknown): ProblemDifficulty {
  if (typeof value === "string") {
    const key = value.trim().toLowerCase();
    if ((PROBLEM_DIFFICULTIES as readonly string[]).includes(key)) {
      return key as ProblemDifficulty;
    }
    if (/olympiad|olympic|олимпиад|ოლიმპ/.test(key)) return "olympiad";
    if (/highly advanced|very hard|contest/.test(key)) return "olympiad";
    if (/რთულ|сложн|hard/.test(key)) return "hard";
    if (/მარტივ|легк|easy/.test(key)) return "easy";
    if (/საშუალო|средн|medium/.test(key)) return "medium";
  }
  return "medium";
}

function yearsFor(difficulty: ProblemDifficulty): ProblemYear[] {
  if (difficulty === "easy") return ["7", "8"];
  if (difficulty === "medium") return ["8", "9", "10"];
  return ["11", "12"];
}

function coerceYear(value: unknown): ProblemYear | null {
  const year =
    typeof value === "number" && Number.isInteger(value)
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : "";
  if ((PROBLEM_YEARS as readonly string[]).includes(year)) {
    return year as ProblemYear;
  }
  return null;
}

function yearsFromId(id: unknown): ProblemYear[] {
  if (typeof id !== "string") return [];
  const match = id.match(/(?:^|[_-])(10|11|12|7|8|9)(?:[_-]|$)/);
  if (!match) return [];
  const year = coerceYear(match[1]);
  return year ? [year] : [];
}

function yearsFromRecord(rec: Record<string, unknown>): ProblemYear[] {
  const raw = rec.years ?? rec.year ?? rec.grade ?? rec.class;
  const listed = (Array.isArray(raw) ? raw : raw != null ? [raw] : [])
    .map(coerceYear)
    .filter((year): year is ProblemYear => year != null);
  if (listed.length > 0) return uniqueList(listed);
  return yearsFromId(rec.id);
}

function difficultiesFromRecord(rec: Record<string, unknown>): ProblemDifficulty[] {
  const raw = rec.difficulties ?? rec.difficulty ?? rec.level;
  const listed = (Array.isArray(raw) ? raw : raw != null ? [raw] : [])
    .filter((item): item is string => typeof item === "string")
    .map((item) => mapDifficulty(item));
  return uniqueList(listed);
}

function mapInstruction(
  value: unknown,
  prompt: string,
  hasNumericAnswer: boolean,
): ProblemInstructionId {
  if (
    typeof value === "string" &&
    (PROBLEM_INSTRUCTIONS as readonly string[]).includes(value)
  ) {
    return value as ProblemInstructionId;
  }
  const text = `${value ?? ""} ${prompt}`.toLowerCase();
  if (/\bevaluat|\bfind the difference|\bx_3\s*-\s*x_1/.test(text) || hasNumericAnswer) {
    return "evaluate";
  }
  if (/\bexpand/.test(text)) return "expand";
  if (/\bfactor/.test(text)) return "factor";
  if (/\bsimplif/.test(text)) return "simplify";
  return "solve";
}

function mapParam(spec: unknown): Record<string, unknown> | null {
  const rec = asRecord(spec);
  if (!rec) {
    if (typeof spec === "number" && Number.isInteger(spec)) {
      return { pick: [spec] };
    }
    return null;
  }
  if ("int" in rec || "pick" in rec || "byDifficulty" in rec) return rec;

  const type = typeof rec.type === "string" ? rec.type.toLowerCase() : "";
  const min = typeof rec.min === "number" ? Math.trunc(rec.min) : undefined;
  const max = typeof rec.max === "number" ? Math.trunc(rec.max) : undefined;
  const looksInt =
    type === "integer" ||
    type === "int" ||
    type === "number" ||
    (min != null && max != null);
  if (!looksInt || (min == null && max == null)) return null;

  const lo = min ?? max ?? 1;
  const hi = max ?? min ?? lo;
  const exclude = Array.isArray(rec.exclude)
    ? rec.exclude
        .filter((item): item is number => typeof item === "number" && Number.isInteger(item))
        .slice(0, 24)
    : [];
  return {
    int: [Math.min(lo, hi), Math.max(lo, hi)],
    ...(rec.nonzero === true || lo > 0 || hi < 0 || exclude.includes(0)
      ? { nonzero: true }
      : {}),
    ...(exclude.length > 0 ? { exclude } : {}),
  };
}

function mapParams(value: unknown): Record<string, unknown> {
  const rec = asRecord(value);
  if (!rec) return {};
  const params: Record<string, unknown> = {};
  for (const [name, spec] of Object.entries(rec)) {
    const mapped = mapParam(spec);
    if (mapped) params[name] = mapped;
  }
  return params;
}

function rewriteConstraint(expr: string): string | null {
  const t = expr.replace(/\s+/g, " ").trim();
  return t || null;
}

function rewriteCasExpr(expr: string) {
  return expr
    .replace(/\bcomb\s*\(/g, "nCr(")
    .replace(/\bchoose\s*\(/g, "nCr(")
    .replace(/\bbinomial\s*\(/g, "nCr(");
}

function mapDerived(value: unknown): Record<string, string> {
  const rec = asRecord(value);
  if (!rec) return {};
  const derived: Record<string, string> = {};
  for (const [name, expr] of Object.entries(rec)) {
    if (typeof expr === "boolean") {
      derived[name] = expr ? "1" : "0";
      continue;
    }
    if (typeof expr !== "string" || !expr.trim()) continue;
    const trimmed = expr.trim();
    const flag = trimmed.toLowerCase();
    if (flag === "true" || flag === "yes") {
      derived[name] = "1";
      continue;
    }
    if (flag === "false" || flag === "no") {
      derived[name] = "0";
      continue;
    }
    derived[name] = rewriteCasExpr(trimmed);
  }
  return derived;
}

function mapConstraints(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const rewritten = rewriteConstraint(item);
    if (rewritten) out.push(rewriteCasExpr(rewritten));
  }
  return out;
}

function inferredDistinctConstraints(
  params: Record<string, unknown>,
  text: string,
): string[] {
  if (!("a" in params) || !("b" in params)) return [];
  if (!/განსხვავ|distinct|different|unequal/i.test(text)) return [];
  return ["a != b"];
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function nestedString(rec: Record<string, unknown>, key: string): string {
  const child = asRecord(rec[key]);
  if (!child) return "";
  for (const name of [
    "combined_equation",
    "simplified_equation",
    "simplified_equation_latex",
    "equation",
  ]) {
    const value = child[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function slugFromName(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "imported-family";
}

function intBand(
  value: number,
  span: number,
  min = 1,
): { int: [number, number]; nonzero: true } {
  const lo = Math.max(min, value - span);
  return { int: [lo, Math.max(lo, value + span)], nonzero: true };
}

/** Formula-card JSON: latex + steps + components, no engine prompt/variants. */
function adaptBinomialFormulaDoc(rec: Record<string, unknown>) {
  const latex =
    (typeof rec.latex === "string" && rec.latex.trim()) ||
    (typeof rec.formula === "string" && rec.formula.trim()) ||
    "";
  const name =
    typeof rec.formula_name === "string" ? rec.formula_name.trim() : "";
  const hay = `${name} ${latex}`;
  if (!/binom|binomial|T_\s*\{\s*r\s*\+\s*1\s*\}/i.test(hay)) return null;

  const components = asRecord(rec.components);
  const nFromComp =
    typeof components?.n === "number" && Number.isInteger(components.n)
      ? components.n
      : null;
  const binom = latex.match(/\\binom\s*\{\s*(\d+)\s*\}\s*\{\s*r\s*\}/);
  const power = latex.match(/\(x\^\{?(\d+)\}?\)/);
  const term = latex.match(/\((\d+)\s*x\^\{?-(\d+)\}?\)/);
  const n = nFromComp ?? (binom ? Number(binom[1]) : null);
  const p = power ? Number(power[1]) : null;
  const a = term ? Number(term[1]) : null;
  const q = term ? Number(term[2]) : null;
  if (n == null || p == null || a == null || q == null) return null;

  return {
    id:
      typeof rec.id === "string" && rec.id.trim()
        ? rec.id.trim().slice(0, 64)
        : slugFromName(name || "binomial-general-term"),
    topic: "algebra" as const,
    difficulties: ["medium", "hard"] as const,
    years: ["10", "11", "12"] as const,
    instructionId: "expand" as const,
    variants: [
      {
        id: "general-term-identity",
        params: {
          n: { int: [Math.max(3, n - 2), n + 2] as [number, number] },
          a: intBand(a, 2, 1),
          p: intBand(p, 1, 1),
          q: intBand(q, 1, 1),
        },
        derived: {
          pn: "p * n",
          coeff: "p + q",
        },
        example: { n, a, p, q },
        prompt:
          "T_{r+1} = \\binom{{{n}}}{r} (x^{{{p}}})^{{{n}}-r} ({{a}}x^{-{{q}}})^r = \\binom{{{n}}}{r} \\cdot {{a}}^r \\cdot x^{{{pn}} - {{p}} r - {{q}} r} = \\binom{{{n}}}{r} \\cdot {{a}}^r \\cdot x^{{{pn}} - {{coeff}} r}",
        solutionSteps: [
          "T_{r+1} &= \\binom{{{n}}}{r} (x^{{{p}}})^{{{n}}-r} ({{a}}x^{-{{q}}})^r",
          "&= \\binom{{{n}}}{r} \\cdot {{a}}^r \\cdot x^{{{pn}} - {{p}} r - {{q}} r}",
          "&= \\binom{{{n}}}{r} \\cdot {{a}}^r \\cdot x^{{{pn}} - {{coeff}} r}",
        ],
      },
    ],
  };
}

function adaptWorkRateFamily(rec: Record<string, unknown>) {
  const equation =
    (typeof rec.combined_equation === "string" ? rec.combined_equation : "") ||
    nestedString(rec, "mathematical_model");
  const hours = workRateHoursFromEquation(equation);
  if (!hours) return null;

  const statement =
    typeof rec.problem_statement === "string" && rec.problem_statement.trim()
      ? rec.problem_statement.trim()
      : "";
  const prompt = slotWorkRateStory(statement, hours.d, hours.h1, hours.h2);
  const id =
    typeof rec.id === "string" && rec.id.trim()
      ? rec.id.trim().slice(0, 64)
      : "two-cluster-work";
  const difficulty = mapDifficulty(rec.difficulty);
  const t = relayAlphaHours(hours.d, hours.h1, hours.h2);
  const tInt = Number.isFinite(t) ? Math.round(t) : hours.h1 + hours.h2;

  return buildWorkRateFamily({
    id,
    difficulties: [difficulty],
    years: yearsFor(difficulty),
    stem: prompt,
    t: tInt,
    d: hours.d,
    h1: hours.h1,
    h2: hours.h2,
  });
}

function joinNonempty(parts: string[]) {
  return parts.map((part) => part.trim()).filter(Boolean).join("\n\n");
}

function looksLikeMathLine(value: string) {
  return /[⊕⊙∈∀∃ℝℤℕℚ⁺⁻]|\\[a-zA-Z]+|[_\^]/.test(value);
}

function asPromptLine(value: string) {
  const text = value.trim();
  if (!text) return "";
  if (text.includes("$") || /[\p{L}]{8,}/u.test(text)) return text;
  return looksLikeMathLine(text) ? `$${text}$` : text;
}

function operationsLines(ops: Record<string, unknown> | null) {
  if (!ops) return [];
  return Object.values(ops).flatMap((value) =>
    typeof value === "string" && value.trim() ? [asPromptLine(value)] : [],
  );
}

function answersToSteps(value: unknown): string[] {
  if (Array.isArray(value)) return stringList(value);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  const rec = asRecord(value);
  if (!rec) return [];
  const steps: string[] = [];
  for (const [key, item] of Object.entries(rec)) {
    const label = key.replaceAll("_", " ");
    if (typeof item === "boolean") {
      steps.push(`${label}: ${item ? "true" : "false"}`);
    } else if (typeof item === "number" && Number.isFinite(item)) {
      steps.push(`${label} = ${item}`);
    } else if (typeof item === "string" && item.trim()) {
      steps.push(item.trim());
    }
  }
  return steps;
}

function stemFromRecord(rec: Record<string, unknown>) {
  const tasks = stringList(rec.tasks ?? rec.questions ?? rec.problems);
  const title = typeof rec.title === "string" ? rec.title.trim() : "";
  const set = typeof rec.set === "string" ? rec.set.trim() : "";
  const field = typeof rec.field === "string" ? rec.field.trim() : "";
  return joinNonempty([
    title,
    set ? asPromptLine(set) : "",
    field ? asPromptLine(`F = ${field}`) : "",
    ...operationsLines(asRecord(rec.operations)),
    ...tasks.map((task, index) => `${index + 1}. ${task}`),
  ]);
}

function looksLikeTaskDoc(rec: Record<string, unknown>) {
  return (
    stringList(rec.tasks ?? rec.questions ?? rec.problems).length > 0 &&
    (asRecord(rec.operations) != null ||
      asRecord(rec.answers) != null ||
      typeof rec.set === "string")
  );
}

function familyIdFrom(rec: Record<string, unknown>, fallback: string) {
  if (typeof rec.id === "string" && rec.id.trim()) {
    return rec.id.trim().slice(0, 64);
  }
  if (typeof rec.title === "string" && rec.title.trim()) {
    return slugFromName(rec.title);
  }
  if (typeof rec.id === "number" && Number.isFinite(rec.id)) {
    return `family-${Math.trunc(rec.id)}`.slice(0, 64);
  }
  return fallback;
}

function variantFromTaskDoc(rec: Record<string, unknown>, index: number) {
  const prompt = stemFromRecord(rec);
  const steps = answersToSteps(rec.answers ?? rec.correct_answer ?? rec.answer);
  if (!prompt) return null;
  const id =
    typeof rec.id === "string" && rec.id.trim()
      ? rec.id.trim().slice(0, 48)
      : typeof rec.id === "number" && Number.isFinite(rec.id)
        ? `task-${Math.trunc(rec.id)}`.slice(0, 48)
        : `task-${index + 1}`;
  const years = yearsFromRecord(rec);
  const diffs = difficultiesFromRecord(rec);
  return {
    id,
    params: {},
    derived: {},
    constraints: [],
    prompt,
    solutionSteps: steps.length > 0 ? steps : [prompt.slice(0, 1600)],
    ...(years.length > 0 ? { years } : {}),
    ...(diffs.length > 0 ? { difficulties: diffs } : {}),
  };
}

function topicHaystack(rec: Record<string, unknown>) {
  return [
    rec.topic,
    rec.title,
    rec.set,
    rec.field,
    JSON.stringify(rec.operations ?? ""),
  ]
    .filter((item) => typeof item === "string")
    .join(" ");
}

function adaptTaskListFamily(rec: Record<string, unknown>) {
  if (!looksLikeTaskDoc(rec)) return null;
  const variant = variantFromTaskDoc(rec, 0);
  if (!variant) return null;
  const hay = topicHaystack(rec);
  const axiom = /აქსიომ|axiom|ვექტორულ სივრც|vector_addition|scalar_multiplication/i.test(
    hay,
  );
  const difficulty = axiom ? ("hard" as const) : mapDifficulty(rec.difficulty);
  const years = yearsFromRecord(rec);
  const diffs = difficultiesFromRecord(rec);
  return {
    id: familyIdFrom(rec, "task-family"),
    topic: mapTopic(hay),
    difficulties: axiom
      ? (["hard"] as const)
      : diffs.length > 0
        ? diffs
        : [difficulty],
    years: years.length > 0 ? years : axiom ? (["11", "12"] as const) : yearsFor(difficulty),
    instructionId: "solve" as const,
    variants: [variant],
  };
}

function formatAnswer(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  const rec = asRecord(value);
  if (!rec) return "";
  const parts: string[] = [];
  for (const item of Object.values(rec)) {
    if (typeof item === "number" && Number.isFinite(item)) parts.push(String(item));
    else if (typeof item === "string" && item.trim()) parts.push(item.trim());
  }
  return parts.join(", ");
}

function formulaFromAnswer(
  answer: string,
  derived: Record<string, unknown>,
  params: Record<string, unknown>,
): string | undefined {
  const match = answer.match(/^\{\{\s*([A-Za-z][A-Za-z0-9_]{0,23})\s*\}\}$/);
  if (!match) return undefined;
  const name = match[1]!;
  const expr = derived[name];
  if (typeof expr === "string" && expr.trim()) return expr.trim();
  if (name in params) return name;
  return undefined;
}

function uniquifyVariantIds(variants: TemplateVariant[]): TemplateVariant[] {
  const used = new Set<string>();
  return variants.map((variant, index) => {
    let id = (variant.id?.trim() || `task-${index + 1}`).slice(0, 48);
    if (used.has(id)) {
      const stem = (id.replace(/-\d+$/, "") || "task").slice(0, 40);
      let n = 2;
      do {
        id = `${stem}-${n}`.slice(0, 48);
        n += 1;
      } while (used.has(id));
    }
    used.add(id);
    return { ...variant, id };
  });
}

function uniqueList<T extends string>(values: T[]): T[] {
  return [...new Set(values)];
}

function mergeTemplates(templates: ProblemTemplate[]): ProblemTemplate {
  const first = templates[0]!;
  return {
    id: first.id,
    topic: first.topic,
    difficulties: uniqueList(templates.flatMap((item) => item.difficulties)),
    years: uniqueList(templates.flatMap((item) => item.years)),
    instructionId: first.instructionId,
    variants: uniquifyVariantIds(
      templates.flatMap((item) =>
        item.variants.map((variant) => ({
          ...variant,
          years: variant.years?.length ? variant.years : item.years,
          difficulties: variant.difficulties?.length
            ? variant.difficulties
            : item.difficulties,
        })),
      ),
    ).slice(0, FAMILY_VARIANT_MAX),
  };
}

function packagedProblemList(rec: Record<string, unknown>): { key: string; list: unknown[] } | null {
  const keys = [
    "vector_space_problems",
    "problems",
    "items",
    "cards",
    "families",
    "examples",
  ];
  for (const key of keys) {
    const value = rec[key];
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((item) => asRecord(item) != null)
    ) {
      return { key, list: value };
    }
  }

  const arrayKeys = Object.entries(rec).filter(([, value]) => Array.isArray(value));
  if (arrayKeys.length !== 1) return null;
  const [key, value] = arrayKeys[0]!;
  if (key === "variants" || key === "tasks" || key === "steps" || key === "solutionSteps") {
    return null;
  }
  const list = value as unknown[];
  if (list.length === 0 || !list.every((item) => asRecord(item) != null)) return null;
  const first = asRecord(list[0]);
  if (!first) return null;
  if (
    looksLikeTaskDoc(first) ||
    typeof first.prompt === "string" ||
    Array.isArray(first.variants)
  ) {
    return { key, list };
  }
  return null;
}

const JSON_ESCAPE = '"\\/bfnrt';

function isHexChar(char: string | undefined) {
  return char != null && /[0-9a-fA-F]/.test(char);
}

/**
 * LaTeX in teacher JSON often uses `\{` / `\quad` / `\mathbb`.
 * Those are not legal JSON escapes (`\{` is the usual failure).
 * Double the backslash inside strings; leave valid JSON escapes alone.
 */
function repairInvalidJsonEscapes(text: string) {
  let out = "";
  let inString = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i]!;
    if (!inString) {
      out += char;
      if (char === '"') inString = true;
      i += 1;
      continue;
    }
    if (char === '"') {
      out += char;
      inString = false;
      i += 1;
      continue;
    }
    if (char !== "\\") {
      out += char;
      i += 1;
      continue;
    }

    const next = text[i + 1];
    if (next == null) {
      out += "\\\\";
      break;
    }
    if (JSON_ESCAPE.includes(next)) {
      out += char + next;
      i += 2;
      continue;
    }
    if (
      next === "u" &&
      isHexChar(text[i + 2]) &&
      isHexChar(text[i + 3]) &&
      isHexChar(text[i + 4]) &&
      isHexChar(text[i + 5])
    ) {
      out += text.slice(i, i + 6);
      i += 6;
      continue;
    }
    out += `\\\\${next}`;
    i += 2;
  }
  return out;
}

function extractJsonValue(text: string): string | null {
  const start = text.search(/[\[{]/);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i]!;
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{" || char === "[") depth += 1;
    else if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Teacher paste: one object, an array, or several objects separated by commas. */
export function parseTeacherJson(raw: string): unknown {
  const text = raw.replace(/^\uFEFF/, "").trim();
  const extracted = extractJsonValue(text) ?? text;
  try {
    return JSON.parse(extracted) as unknown;
  } catch {
    const repaired = repairInvalidJsonEscapes(extracted);
    try {
      return JSON.parse(repaired) as unknown;
    } catch {
      return JSON.parse(`[${repaired.replace(/,+\s*$/, "")}]`) as unknown;
    }
  }
}

/** Map a teacher/author JSON dialect onto the engine schema. */
export function adaptExternalTemplate(raw: unknown): unknown {
  if (Array.isArray(raw)) {
    const docs = raw.flatMap((item) => {
      const rec = asRecord(item);
      return rec ? [rec] : [];
    });
    if (docs.length === 0) return raw;
    if (docs.length === 1) return adaptExternalTemplate(docs[0]);

    const templates: ProblemTemplate[] = [];
    for (const doc of docs) {
      const parsed = problemTemplateSchema.safeParse(adaptExternalTemplate(doc));
      if (parsed.success) templates.push(parsed.data);
    }
    if (templates.length === 0) return raw;
    if (templates.length === 1) return templates[0];
    return mergeTemplates(templates);
  }

  const rec = asRecord(raw);
  if (!rec) return raw;

  const alreadyEngine =
    Array.isArray(rec.variants) &&
    Array.isArray(rec.difficulties) &&
    typeof rec.topic === "string" &&
    (PROBLEM_TOPICS as readonly string[]).includes(rec.topic) &&
    typeof rec.instructionId === "string";
  if (alreadyEngine) return rec;

  const pack = packagedProblemList(rec);
  if (pack) {
    const adapted = adaptExternalTemplate(pack.list);
    const out = asRecord(adapted);
    if (!out) return adapted;
    return { ...out, id: slugFromName(pack.key.replaceAll("_", " ")) };
  }

  const binomial = adaptBinomialFormulaDoc(rec);
  if (binomial) return binomial;

  const workRate = adaptWorkRateFamily(rec);
  if (workRate) return workRate;

  const taskList = adaptTaskListFamily(rec);
  if (taskList) return taskList;

  const listedDifficulties = difficultiesFromRecord(rec);
  const difficulty = listedDifficulties[0] ?? mapDifficulty(rec.difficulty);
  const params = mapParams(rec.params ?? rec.variables);
  const derived = mapDerived(rec.derived);
  const names = new Set([...Object.keys(params), ...Object.keys(derived)]);
  const prompt = repairImportedTexSlots(
    expandSlots(
      String(
        rec.prompt ??
          rec.prompt_latex ??
          rec.promptTex ??
          rec.problem_statement ??
          rec.statement ??
          rec.text ??
        rec.latex ??
        rec.formula_name ??
        stemFromRecord(rec) ??
        "",
      ),
      names,
    ),
    names,
  );
  const steps = stringList(
    rec.solutionSteps ?? rec.solution_steps ?? rec.steps,
  ).map((step) => repairImportedTexSlots(expandSlots(step, names), names));
  if (steps.length === 0) {
    steps.push(
      ...answersToSteps(rec.answers ?? rec.correct_answer ?? rec.answer),
    );
  }
  const answer = expandSlots(
    (typeof rec.answer === "string" && rec.answer.trim()
      ? rec.answer.trim()
      : formatAnswer(rec.answers ?? rec.correct_answer)) || "",
    names,
  );
  if (answer && !steps.some((step) => step.includes(answer))) {
    steps.push(answer);
  }

  const years = yearsFromRecord(rec);
  const familyDifficulties =
    listedDifficulties.length > 0 ? listedDifficulties : [difficulty];
  const familyYears = years.length > 0 ? years : yearsFor(difficulty);
  const constraints = [
    ...mapConstraints(rec.constraints),
    ...inferredDistinctConstraints(params, `${prompt}\n${steps.join("\n")}`),
  ];

  const rawFormula = rec.formula;
  const formulaText = typeof rawFormula === "string" ? rawFormula.trim() : "";
  const formulaLooksLikeCas =
    formulaText.length > 0 && !/\\|binom|frac|cdot/.test(formulaText);
  const explicitFormula = formulaLooksLikeCas
    ? formulaText
    : formulaFromAnswer(answer, derived, params);

  return {
    id: familyIdFrom(rec, "imported-family"),
    topic: mapTopic(topicHaystack(rec) || String(rec.topic ?? "")),
    difficulties: familyDifficulties,
    years: familyYears,
    instructionId: mapInstruction(rec.instructionId, prompt, Boolean(answer)),
    variants: [
      {
        id: typeof rec.id === "string" ? rec.id.slice(0, 48) : "main",
        params,
        derived,
        constraints,
        prompt,
        ...(years.length > 0 ? { years } : {}),
        ...(listedDifficulties.length > 0
          ? { difficulties: listedDifficulties }
          : {}),
        ...(explicitFormula ? { formula: explicitFormula } : {}),
        ...(steps.length > 0
          ? { solutionSteps: steps }
          : { solution: answer || prompt }),
      },
    ],
  };
}

export function parseProblemTemplate(raw: unknown) {
  return problemTemplateSchema.safeParse(adaptExternalTemplate(raw));
}

export function parseProblemTemplateOrThrow(raw: unknown): ProblemTemplate {
  return problemTemplateSchema.parse(adaptExternalTemplate(raw));
}
