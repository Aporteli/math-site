import { setCookie } from '@/lib/helpers/cookies';
import {
  HIDDEN_SEED_COOKIE,
  parseHiddenSeedIds,
  type ProblemBankCopy,
  type BankProblem,
  type ProblemDifficulty,
  type ProblemYear,
  type SavedProblemFamily,
} from '@/lib/math/problems';
import { collectTemplateGenerateLabels } from '@/lib/math/problems/generate';
import { taxonomyLabel } from '@/lib/math/problems/taxonomy-shared';
import { replaceTokens } from '@/lib/math/problems/catalog';
import type { AiModelStatus } from '@/lib/math/problems/ai-limits';
import type { TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';
import type { Locale } from '@/i18n/config';

export const fieldClass =
  'w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15';

export const panelClass = 'rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5';

export function sourceBadgeLabel(copy: ProblemBankCopy, problem: BankProblem) {
  if (problem.templateId === 'ai-verified') return copy.sources.verified;
  if (problem.templateId === 'ai-plain') return copy.sources.unchecked;
  return copy.sources[problem.source];
}

/** Prefer curriculum Branch name; fall back to legacy topic label. */
export function problemBranchLabel(
  copy: ProblemBankCopy,
  problem: BankProblem,
  nodes: TaxonomyNodeDto[],
  locale: Locale,
) {
  const byId = new Map(nodes.map((node) => [node.id, node]));

  if (problem.branchId) {
    const branch = byId.get(problem.branchId);
    if (branch?.level === 'branch') return taxonomyLabel(branch, locale);
  }

  if (problem.topicNodeId) {
    const topic = byId.get(problem.topicNodeId);
    if (topic?.parentId) {
      const branch = byId.get(topic.parentId);
      if (branch?.level === 'branch') return taxonomyLabel(branch, locale);
    }
  }

  return copy.topics[problem.topic as keyof typeof copy.topics];
}

export function hideCatalogSeed(id: string) {
  const hidden = new Set(parseHiddenSeedIds(readCookie(HIDDEN_SEED_COOKIE)));
  hidden.add(id);
  setCookie(HIDDEN_SEED_COOKIE, [...hidden].join(','));
}

export function generateLabelsFromFamilies(list: SavedProblemFamily[]) {
  const years = new Set<ProblemYear>();
  const difficulties = new Set<ProblemDifficulty>();
  for (const family of list) {
    try {
      const labels = collectTemplateGenerateLabels(JSON.parse(family.json) as unknown);
      for (const year of labels.years) years.add(year);
      for (const difficulty of labels.difficulties) {
        difficulties.add(difficulty);
      }
    } catch {
      /* skip unreadable family json */
    }
  }
  return { years, difficulties };
}

function readCookie(name: string) {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return match?.slice(name.length + 1);
}

type GenerateCopy = ProblemBankCopy['generate'];

export function walletAmount(copy: GenerateCopy, wallet: AiModelStatus['wallet']) {
  if (wallet.balance && wallet.currency) {
    return replaceTokens(copy.walletAmount, {
      amount: wallet.balance,
      currency: wallet.currency,
    });
  }
  return '';
}

export function walletChipLabel(copy: GenerateCopy, wallet: AiModelStatus['wallet']) {
  switch (wallet.state) {
    case 'missing_key':
      return copy.limitNoKey;
    case 'invalid_key':
      return copy.walletInvalid;
    case 'needs_billing':
      return copy.walletNeedsBilling;
    case 'ready': {
      const amount = walletAmount(copy, wallet);
      if (amount) return amount;
      return wallet.kind === 'free' ? copy.walletFree : copy.walletReady;
    }
    default:
      return wallet.kind === 'free' ? copy.walletFree : copy.walletUnknown;
  }
}

export function walletHint(copy: GenerateCopy, wallet: AiModelStatus['wallet']) {
  switch (wallet.state) {
    case 'missing_key':
      return copy.walletHintMissing;
    case 'invalid_key':
      return copy.walletHintInvalid;
    case 'needs_billing':
      return copy.walletHintNeedsBilling;
    case 'ready': {
      if (wallet.kind === 'free') return copy.walletHintReadyFree;
      const detail = walletAmount(copy, wallet) || copy.walletReady;
      return replaceTokens(copy.walletHintReadyPaid, { detail });
    }
    default:
      return wallet.kind === 'free' ? copy.walletHintReadyFree : copy.walletHintUnknown;
  }
}

export function walletTone(wallet: AiModelStatus['wallet'], selected: boolean) {
  if (wallet.state === 'needs_billing' || wallet.state === 'invalid_key') {
    return 'border-brass/20 bg-brass-tint/40 text-brass-strong';
  }
  if (wallet.state === 'missing_key') {
    return 'border-hairline bg-white text-muted';
  }
  if (selected) return 'border-navy/20 bg-navy-tint text-navy';
  return 'border-hairline bg-white text-body';
}

export function uniqueProviders(status: AiModelStatus[]) {
  const seen = new Set<string>();
  return status.filter((item) => {
    if (seen.has(item.provider)) return false;
    seen.add(item.provider);
    return true;
  });
}

export const difficultyTone: Record<ProblemDifficulty, string> = {
  easy: 'bg-navy-tint text-navy',
  medium: 'bg-brass-tint text-brass',
  hard: 'border border-hairline bg-paper-deep text-brass-strong',
  olympiad: 'bg-navy text-brass-soft',
};
