import { PROBLEM_BANK_TOOLS, type BankProblem, type ProblemBankToolId, type ProblemFilters } from '@/lib/math/problems';
import { getNextTaxonomyFilters, type TaxonomyFilterKey } from '../helpers/problem-bank.helpers';
import type { ProblemBankActionContext } from './problem-bank-action-context';

export function bindUiActions(ctx: ProblemBankActionContext) {
  function updateTaxonomyFilter(key: TaxonomyFilterKey, value: string) {
    ctx.setFilters((current) => getNextTaxonomyFilters(current, key, value));
  }

  function updateFilter<K extends keyof ProblemFilters>(key: K, value: ProblemFilters[K]) {
    ctx.setFilters((current) => ({ ...current, [key]: value }));
  }

  function openProblemChat(problem: BankProblem) {
    ctx.setSelectedId(problem.id);
    ctx.setShowSolution(false);
    ctx.setProblemChatDraft(problem.promptTex);
    ctx.setProblemChatOpen(true);
  }

  async function copyProblemPrompt(problem: BankProblem) {
    try {
      await navigator.clipboard.writeText(problem.promptTex);
      ctx.setNotice(ctx.copy.copiedPrompt);
    } catch {
      ctx.setNotice(ctx.copy.generate.errorFailed);
    }
  }

  function onTool(id: ProblemBankToolId) {
    const tool = PROBLEM_BANK_TOOLS.find((item) => item.id === id);
    if (!tool) return;

    if (id === 'generate' || id === 'variants' || id === 'families' || id === 'chat') {
      ctx.setPanel((current) => (current === id ? null : id));
      ctx.setNotice(null);
      return;
    }

    if (id === 'import') {
      ctx.setImportOpen(true);
      ctx.setNotice(null);
      return;
    }

    if (id === 'createCard') {
      ctx.setCustomCardOpen(true);
      ctx.setNotice(null);
      return;
    }

    if (tool.status === 'soon') {
      ctx.setNotice(ctx.copy.tools[id].hint);
    }
  }

  return {
    updateTaxonomyFilter,
    updateFilter,
    openProblemChat,
    copyProblemPrompt,
    onTool,
  };
}
