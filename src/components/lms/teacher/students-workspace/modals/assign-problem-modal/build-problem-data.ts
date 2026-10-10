import type { SetProblem } from '../../types/teacher-workspace.types';
import type { AssignProblemData, SelectedProblemDetails } from './types';

export function buildProblemData(
  selectedProblemId: string,
  safeTitle: string,
  selectedProblem: SetProblem | undefined,
  selectedProblemDetails: SelectedProblemDetails | null,
): AssignProblemData | null {
  if (selectedProblemId === 'custom') {
    return {
      id: 'custom-' + Date.now(),
      topic: safeTitle,
      difficulty: 'medium',
      promptTex: '',
      solutionTex: '',
    };
  }

  if (!selectedProblem || !selectedProblemDetails) return null;

  return {
    id: selectedProblem.id,
    topic: selectedProblem.title,
    difficulty: 'medium',
    promptTex: selectedProblemDetails.promptTex || '',
    solutionTex: selectedProblemDetails.solutionTex || '',
  };
}
