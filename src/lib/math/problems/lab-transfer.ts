import type { BankProblem } from "./types";

const LAB_TRANSFER_KEY = "math-site:teacher-lab-transfer";

function isBankProblem(value: unknown): value is BankProblem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.id === "string" &&
    typeof rec.templateId === "string" &&
    typeof rec.topic === "string" &&
    typeof rec.difficulty === "string" &&
    (typeof rec.year === "string" || rec.year === undefined) &&
    typeof rec.source === "string" &&
    typeof rec.instructionId === "string" &&
    typeof rec.promptTex === "string" &&
    typeof rec.solutionTex === "string"
  );
}

/** Stash a bank problem so the lab page can open it once. */
export function stashProblemForLab(problem: BankProblem) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(LAB_TRANSFER_KEY, JSON.stringify(problem));
}

/** Read and clear a problem transferred from the bank page. */
export function takeProblemForLab(): BankProblem | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(LAB_TRANSFER_KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(LAB_TRANSFER_KEY);
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isBankProblem(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
