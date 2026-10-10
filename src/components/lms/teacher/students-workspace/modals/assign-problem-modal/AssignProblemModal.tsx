'use client';

import { AssignProblemBody } from './AssignProblemBody';
import { AssignProblemDragOverlay } from './AssignProblemDragOverlay';
import { AssignProblemHeader } from './AssignProblemHeader';
import { getAssignProblemView } from './get-assign-problem-view';
import { sendProblemAssignment } from './send-problem-assignment';
import type { AssignProblemModalProps } from './types';
import { useAssignProblemState } from './use-assign-problem-state';

export function AssignProblemModal({
  isOpen = true,
  onClose,
  activeStudent,
  availableSetProblems,
  onSuccess,
}: AssignProblemModalProps) {
  const state = useAssignProblemState(isOpen);

  if (!isOpen) return null;

  const view = getAssignProblemView({
    availableSetProblems,
    problemSearchQuery: state.problemSearchQuery,
    selectedProblemId: state.selectedProblemId,
    assigning: state.assigning,
    assignImages: state.assignImages,
    assignComment: state.assignComment,
    loadingProblemDetails: state.loadingProblemDetails,
    selectedProblemDetails: state.selectedProblemDetails,
  });

  async function handleSend() {
    await sendProblemAssignment({
      selectedProblemId: state.selectedProblemId,
      customTitle: state.customTitle,
      assignComment: state.assignComment,
      selectedProblem: view.selectedProblem,
      selectedProblemDetails: state.selectedProblemDetails,
      assignImages: state.assignImages,
      studentId: activeStudent.id,
      setAssigning: state.setAssigning,
      onSuccess,
      onClose,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => !state.assigning && onClose()}
      onDragEnter={state.handleDragEnter}
      onDragLeave={state.handleDragLeave}
      onDragOver={state.handleDragOver}
      onDrop={state.handleDrop}>
      <div
        className={`relative flex w-full max-w-2xl flex-col overflow-hidden rounded-box border bg-paper shadow-2xl animate-in zoom-in-95 duration-150 ${
          state.isDraggingOver ? 'border-navy ring-2 ring-navy/30' : 'border-hairline'
        }`}
        onClick={(e) => e.stopPropagation()}>
        <AssignProblemDragOverlay isDraggingOver={state.isDraggingOver} />

        <AssignProblemHeader studentName={activeStudent.name} onClose={onClose} />

        <AssignProblemBody
          assignFileRef={state.assignFileRef}
          assignImages={state.assignImages}
          setAssignImages={state.setAssignImages}
          onFiles={state.addFiles}
          assignComment={state.assignComment}
          onCommentChange={state.setAssignComment}
          isSendDisabled={view.isSendDisabled}
          assigning={state.assigning}
          onSend={() => void handleSend()}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
