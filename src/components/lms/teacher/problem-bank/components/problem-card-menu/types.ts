import type { LucideIcon } from 'lucide-react';
import type { BankProblem, ProblemBankCopy } from '@/lib/math/problems';

export interface CourseStudent {
  id: string;
  name: string;
  email?: string;
}

export interface CourseGroup {
  id: string;
  title: string;
  students: CourseStudent[];
}

export interface ProblemCardMenuProps {
  problem: BankProblem;
  copy: ProblemBankCopy;
  inSet: boolean;
  inLab?: boolean;
  showSendToLab?: boolean;
  showSaveToLab?: boolean;
  showGenerateVariants?: boolean;
  canGenerateVariants?: boolean;
  onEdit: (problem: BankProblem) => void;
  onAskAi: (problem: BankProblem) => void;
  onCopyPrompt: (problem: BankProblem) => void;
  onToggleSet: (problem: BankProblem) => void;
  onSendToLab?: (problem: BankProblem) => void;
  onSaveToLab?: (problem: BankProblem) => void;
  onSaveToBank?: (problem: BankProblem) => void;
  onRemoveFromLab?: (problem: BankProblem) => void;
  onGenerateVariants?: (problem: BankProblem) => void;
  onDiscard: (problem: BankProblem) => void;
}

export type MenuCoords = { top: number; left: number };

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  highlight?: boolean;
  danger?: boolean;
  onClick: () => void;
}
