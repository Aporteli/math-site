import type { LucideIcon } from "lucide-react";
import {
  FileUp,
  LineChart,
  Printer,
  Send,
  Shuffle,
  Sparkles,
} from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import {
  EMPTY_PROBLEM_FILTERS,
  PROBLEM_TOPICS,
  type BankProblem,
  type ProblemFilters,
  type ProblemTopic,
} from "./types";

export type ProblemBankCopy = Dictionary["dashboard"]["teacher"]["problemBank"];
export type ProblemBankToolId = Exclude<keyof ProblemBankCopy["tools"], "label">;

export type ProblemToolStatus = "ready" | "soon" | "link";

export interface ProblemBankTool {
  id: ProblemBankToolId;
  icon: LucideIcon;
  status: ProblemToolStatus;
  href?: string;
}

/**
 * Teacher tools that plug into the problem-bank workspace.
 * Add an entry here (and matching i18n keys) when a new tool is ready.
 */
export const PROBLEM_BANK_TOOLS: ProblemBankTool[] = [
  { id: "generate", icon: Sparkles, status: "ready" },
  { id: "import", icon: FileUp, status: "ready" },
  { id: "variants", icon: Shuffle, status: "ready" },
  {
    id: "worksheet",
    icon: Printer,
    status: "link",
    href: "/teacher/problems",
  },
  { id: "assign", icon: Send, status: "soon" },
  {
    id: "graph",
    icon: LineChart,
    status: "link",
    href: "/tools/graphing",
  },
];

export function topicLabel(
  topics: ProblemBankCopy["topics"],
  topic: string,
) {
  if (Object.hasOwn(topics, topic)) {
    return topics[topic as ProblemTopic];
  }
  return topic.replaceAll("-", " ");
}

export function kindLabel(
  kinds: ProblemBankCopy["generate"]["kinds"],
  id: string,
) {
  if (Object.hasOwn(kinds, id)) {
    return kinds[id as keyof typeof kinds];
  }
  return id.replaceAll("-", " ");
}

export function topicsInBank(problems: BankProblem[]) {
  const seen = new Set<string>(PROBLEM_TOPICS);
  const extra: string[] = [];
  for (const problem of problems) {
    if (!seen.has(problem.topic)) {
      seen.add(problem.topic);
      extra.push(problem.topic);
    }
  }
  return [...PROBLEM_TOPICS, ...extra];
}

export function filterProblems(
  problems: BankProblem[],
  filters: ProblemFilters = EMPTY_PROBLEM_FILTERS,
): BankProblem[] {
  const q = filters.query.trim().toLowerCase();

  return problems.filter((problem) => {
    if (filters.topic !== "all" && problem.topic !== filters.topic) {
      return false;
    }
    if (
      filters.difficulty !== "all" &&
      problem.difficulty !== filters.difficulty
    ) {
      return false;
    }
    if (filters.year !== "all" && problem.year !== filters.year) {
      return false;
    }
    if (filters.source !== "all" && problem.source !== filters.source) {
      return false;
    }
    if (filters.check === "unchecked" && problem.templateId !== "ai-plain") {
      return false;
    }
    if (filters.check === "verified" && problem.templateId !== "ai-verified") {
      return false;
    }
    if (!q) return true;

    return (
      problem.promptTex.toLowerCase().includes(q) ||
      problem.solutionTex.toLowerCase().includes(q) ||
      problem.templateId.includes(q) ||
      problem.topic.includes(q)
    );
  });
}

export function replaceCount(template: string, count: number) {
  return template.replace("{count}", String(count));
}

export function replaceTokens(
  template: string,
  tokens: Record<string, string | number>,
) {
  return Object.entries(tokens).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
