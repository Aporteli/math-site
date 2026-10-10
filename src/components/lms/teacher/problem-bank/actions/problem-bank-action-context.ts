import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Locale } from '@/i18n/config';
import type {
  AiCheckMode,
  AiModelId,
  AiModelStatus,
  BankProblem,
  ProblemBankCopy,
  ProblemDifficulty,
  ProblemFilters,
  ProblemTopic,
  ProblemYear,
  SavedProblemFamily,
} from '@/lib/math/problems';
import type { ProblemBankPanel, ProblemGenMode } from '../problem-bank-workspace.types';

export type ProblemBankActionContext = {
  copy: ProblemBankCopy;
  locale: Locale;
  showSaveToLab: boolean;
  bank: BankProblem[];
  setBank: Dispatch<SetStateAction<BankProblem[]>>;
  setFilters: Dispatch<SetStateAction<ProblemFilters>>;
  selectedId: string | null;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  lessonSetIds: string[];
  setLessonSetIds: Dispatch<SetStateAction<string[]>>;
  labIds: string[];
  setLabIds: Dispatch<SetStateAction<string[]>>;
  draftIds: string[];
  setDraftIds: Dispatch<SetStateAction<string[]>>;
  setShowSolution: Dispatch<SetStateAction<boolean>>;
  setPanel: Dispatch<SetStateAction<ProblemBankPanel>>;
  setImportOpen: Dispatch<SetStateAction<boolean>>;
  setCustomCardOpen: Dispatch<SetStateAction<boolean>>;
  editingProblem: BankProblem | null;
  setNotice: Dispatch<SetStateAction<string | null>>;
  setProblemChatDraft: Dispatch<SetStateAction<string>>;
  setProblemChatOpen: Dispatch<SetStateAction<boolean>>;
  families: SavedProblemFamily[];
  genTopic: ProblemTopic | 'any';
  setGenTopic: Dispatch<SetStateAction<ProblemTopic | 'any'>>;
  genKind: string;
  setGenKind: Dispatch<SetStateAction<string>>;
  genDifficulty: ProblemDifficulty | 'any';
  genYear: ProblemYear | 'any';
  genCount: number;
  genMode: ProblemGenMode;
  genRequest: string;
  genReplyLocale: Locale;
  genModel: AiModelId;
  genCheck: AiCheckMode;
  setGenerating: Dispatch<SetStateAction<boolean>>;
  setSaving: Dispatch<SetStateAction<boolean>>;
  setModelStatus: Dispatch<SetStateAction<AiModelStatus[]>>;
  variantCount: number;
  selectedProblemIds: string[];
  setSelectedProblemIds: Dispatch<SetStateAction<string[]>>;
  confirmBulkDelete: boolean;
  setConfirmBulkDelete: Dispatch<SetStateAction<boolean>>;
  bulkSelectMode: boolean;
  setBulkSelectMode: Dispatch<SetStateAction<boolean>>;
  longPressTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  longPressTriggeredRef: MutableRefObject<boolean>;
  familyGenerateTargets: SavedProblemFamily[];
  selected: BankProblem | null;
  selectedVisibleIds: string[];
  allVisibleSelected: boolean;
  visibleIds: string[];
};
