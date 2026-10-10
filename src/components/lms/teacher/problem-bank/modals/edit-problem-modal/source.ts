import { PROBLEM_SOURCES, type BankProblem } from '@/lib/math/problems';
import type { EditSource } from './types';

export function sourceFromProblem(problem: BankProblem): EditSource {
  if (problem.templateId === 'ai-verified') return 'verified';
  if (problem.templateId === 'ai-plain') return 'unchecked';
  if ((PROBLEM_SOURCES as readonly string[]).includes(problem.source)) {
    return problem.source as EditSource;
  }
  return 'unchecked';
}

export function applySource(problem: BankProblem, next: EditSource): Pick<BankProblem, 'source' | 'templateId'> {
  if (next === 'verified') {
    return {
      source: problem.source === 'bank' || problem.source === 'custom' ? 'ai' : problem.source,
      templateId: 'ai-verified',
    };
  }

  if (next === 'unchecked') {
    return {
      source: problem.source === 'bank' || problem.source === 'custom' ? 'ai' : problem.source,
      templateId: 'ai-plain',
    };
  }

  if (next === 'custom') {
    return { source: 'custom', templateId: 'custom' };
  }

  if (next === 'ai') {
    return { source: 'ai', templateId: 'ai' };
  }

  if (next === 'generated') {
    return {
      source: 'generated',
      templateId:
        problem.templateId === 'ai-plain' || problem.templateId === 'ai-verified' ? 'generated' : problem.templateId,
    };
  }

  return {
    source: 'bank',
    templateId: problem.templateId === 'ai-plain' || problem.templateId === 'ai-verified' ? 'bank' : problem.templateId,
  };
}
