import type { SetProblem } from '../../types/teacher-workspace.types';
import { filterSetProblems } from './filter-set-problems';
import { isSendDisabled } from './is-send-disabled';
import type { AssignImage, SelectedProblemDetails } from './types';

export function getAssignProblemView({
  availableSetProblems,
  problemSearchQuery,
  selectedProblemId,
  assigning,
  assignImages,
  assignComment,
  loadingProblemDetails,
  selectedProblemDetails,
}: {
  availableSetProblems: SetProblem[];
  problemSearchQuery: string;
  selectedProblemId: string;
  assigning: boolean;
  assignImages: AssignImage[];
  assignComment: string;
  loadingProblemDetails: boolean;
  selectedProblemDetails: SelectedProblemDetails | null;
}) {
  const filteredSetProblems = filterSetProblems(availableSetProblems, problemSearchQuery);
  const selectedProblem = availableSetProblems.find((p) => p.id === selectedProblemId);

  return {
    filteredSetProblems,
    selectedProblem,
    isSendDisabled: isSendDisabled({
      assigning,
      selectedProblemId,
      assignImages,
      assignComment,
      selectedProblem,
      loadingProblemDetails,
      selectedProblemDetails,
    }),
  };
}
