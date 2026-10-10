import type { SetProblem } from '../../types/teacher-workspace.types';
import type { AssignImage, SelectedProblemDetails } from './types';

export function isSendDisabled({
  assigning,
  selectedProblemId,
  assignImages,
  assignComment,
  selectedProblem,
  loadingProblemDetails,
  selectedProblemDetails,
}: {
  assigning: boolean;
  selectedProblemId: string;
  assignImages: AssignImage[];
  assignComment: string;
  selectedProblem: SetProblem | undefined;
  loadingProblemDetails: boolean;
  selectedProblemDetails: SelectedProblemDetails | null;
}) {
  return (
    assigning ||
    (selectedProblemId === 'custom' && assignImages.length === 0 && !assignComment.trim()) ||
    (selectedProblemId !== 'custom' && (!selectedProblem || loadingProblemDetails || !selectedProblemDetails))
  );
}
