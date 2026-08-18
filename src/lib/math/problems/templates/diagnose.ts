import type { ZodError } from "zod";
import { generateFromTemplate, type GenerateProblemsInput } from "../algorithms";
import type { BankProblem } from "../types";
import { parseProblemTemplate } from "./adapt";
import type { ProblemTemplate } from "./schema";

export type DiagnoseHint =
  | "json"
  | "name"
  | "enum"
  | "length"
  | "missing"
  | "collide"
  | "sample"
  | "schema";

export interface TemplateDiagnosis {
  hint: DiagnoseHint;
  lines: string[];
}

const MAX_LINES = 8;

function pathOf(issue: { path: readonly PropertyKey[] }) {
  return issue.path.map(String).filter(Boolean).join(".") || "(root)";
}

function classifyIssue(issue: {
  path: readonly PropertyKey[];
  message: string;
  code?: string;
}): DiagnoseHint {
  const path = pathOf(issue).toLowerCase();
  const msg = issue.message.toLowerCase();
  const code = (issue.code ?? "").toLowerCase();

  if (msg.includes("parameter name") || msg.includes("invalid parameter")) {
    return "name";
  }
  if (msg.includes("collide")) return "collide";
  if (msg.includes("solution") && msg.includes("needs")) return "missing";
  if (
    code.includes("too_big") ||
    msg.includes("too_big") ||
    msg.includes("too big") ||
    msg.includes("max")
  ) {
    return "length";
  }
  if (
    path.includes("topic") ||
    path.includes("difficult") ||
    path.includes("years") ||
    path.includes("instruction")
  ) {
    return "enum";
  }
  if (
    code.includes("invalid_type") ||
    msg.includes("required") ||
    msg.includes("expected")
  ) {
    return "missing";
  }
  return "schema";
}

function fromZod(error: ZodError): TemplateDiagnosis {
  const issues = error.issues.slice(0, MAX_LINES);
  const first = issues[0];
  return {
    hint: first ? classifyIssue(first) : "schema",
    lines: issues.map((issue) => `${pathOf(issue)}: ${issue.message}`),
  };
}

export function readTemplateJson(
  raw: string,
):
  | { ok: true; template: ProblemTemplate }
  | { ok: false; diagnosis: TemplateDiagnosis } {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    return {
      ok: false,
      diagnosis: {
        hint: "json",
        lines: detail ? [detail] : [],
      },
    };
  }

  const parsed = parseProblemTemplate(parsedJson);
  if (!parsed.success) {
    return { ok: false, diagnosis: fromZod(parsed.error) };
  }
  return { ok: true, template: parsed.data };
}

export function previewTemplateJson(
  raw: string,
  input: Pick<GenerateProblemsInput, "count" | "locale" | "difficulty" | "year">,
):
  | { ok: true; template: ProblemTemplate; problem: BankProblem }
  | { ok: false; diagnosis: TemplateDiagnosis } {
  const read = readTemplateJson(raw);
  if (!read.ok) return read;

  try {
    const [problem] = generateFromTemplate(read.template, {
      count: 1,
      locale: input.locale,
      difficulty: input.difficulty,
      year: input.year,
      anchorExample: true,
    });
    if (!problem) {
      return {
        ok: false,
        diagnosis: { hint: "sample", lines: [] },
      };
    }
    return { ok: true, template: read.template, problem };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    return {
      ok: false,
      diagnosis: {
        hint: "sample",
        lines: detail ? [detail] : [],
      },
    };
  }
}
