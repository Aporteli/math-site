import type { BankProblem } from '@/lib/math/problems';

const LOCAL_STORAGE_DRAFTS_KEY = 'math_lms_local_problems_drafts';

export function getLocalDraftProblems(): BankProblem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_DRAFTS_KEY);
    return data ? (JSON.parse(data) as BankProblem[]) : [];
  } catch {
    return [];
  }
}

export function setLocalDraftProblems(problems: BankProblem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_DRAFTS_KEY, JSON.stringify(problems));
  } catch {
    // LocalStorage-ის შეცდომის იგნორირება
  }
}
