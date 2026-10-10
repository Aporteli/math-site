import type { Locale } from '@/i18n/config';
import type { BankProblem, ProblemBankCopy, ProblemBankToolId, SavedProblemFamily } from '@/lib/math/problems';
import type { TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';

export type ProblemBankPanel = 'generate' | 'variants' | 'families' | 'chat' | 'createCard' | null;

export type ProblemBankInitialPanel = 'generate' | 'variants' | 'families' | 'chat' | null;

export type ProblemGenMode = 'algorithms' | 'diverse' | 'families';

export interface ProblemBankWorkspaceProps {
  locale: Locale;
  title: string;
  subtitle: string;
  copy: ProblemBankCopy;
  initialBank: BankProblem[];
  initialLessonSetIds: string[];
  initialFamilies?: SavedProblemFamily[];
  hydrateSavedBank?: boolean;
  visibleToolIds?: ProblemBankToolId[];
  initialPanel?: ProblemBankInitialPanel;
  showGenerateVariants?: boolean;
  showSendToLab?: boolean;
  showCreateCard?: boolean;
  showSaveToLab?: boolean;
  initialLabIds?: string[];
  enableSlashPrompts?: boolean;
  slashPromptsUserId?: string;
  taxonomyNodes?: TaxonomyNodeDto[];
}
