import type { StudentAssignment, StudentItem, SetProblem } from '../../types/teacher-workspace.types';

export interface AssignProblemModalProps {
  isOpen?: boolean;
  onClose: () => void;
  activeStudent: StudentItem;
  availableSetProblems: SetProblem[];
  onSuccess: (newAssignment: StudentAssignment) => void;
}

export interface AssignImage {
  dataUrl: string;
  fileName: string;
}

export interface SelectedProblemDetails {
  promptTex: string;
  solutionTex: string;
}

export interface AssignProblemData {
  id: string;
  topic: string;
  difficulty: string;
  promptTex: string;
  solutionTex: string;
}
