import { Copy, MessageSquare, PenLine, Trash2, Users } from 'lucide-react';
import type { BankProblem, ProblemBankCopy } from '@/lib/math/problems';
import type { MenuItem } from './types';

export function buildMenuItems({
  problem,
  copy,
  onEdit,
  onAskAi,
  onCopyPrompt,
  onDiscard,
  run,
  setOpen,
  setIsClassModalOpen,
}: {
  problem: BankProblem;
  copy: ProblemBankCopy;
  onEdit: (problem: BankProblem) => void;
  onAskAi: (problem: BankProblem) => void;
  onCopyPrompt: (problem: BankProblem) => void;
  onDiscard: (problem: BankProblem) => void;
  run: (action: () => void) => void;
  setOpen: (open: boolean) => void;
  setIsClassModalOpen: (open: boolean) => void;
}): MenuItem[] {
  const menu = copy.cardMenu;

  return [
    {
      id: 'send-class',
      label: 'კლასისთვის გაგზავნა',
      icon: Users,
      highlight: true,
      onClick: () => {
        setOpen(false);
        setIsClassModalOpen(true);
      },
    },
    {
      id: 'edit',
      label: menu.edit,
      icon: PenLine,
      onClick: () => run(() => onEdit(problem)),
    },
    {
      id: 'ask-ai',
      label: menu.askAi,
      icon: MessageSquare,
      onClick: () => run(() => onAskAi(problem)),
    },
    {
      id: 'copy',
      label: menu.copyPrompt,
      icon: Copy,
      onClick: () => run(() => onCopyPrompt(problem)),
    },
    {
      id: 'discard',
      label: problem.source === 'bank' ? copy.generate.remove : copy.generate.discard,
      icon: Trash2,
      danger: true,
      onClick: () => run(() => onDiscard(problem)),
    },
  ];
}
