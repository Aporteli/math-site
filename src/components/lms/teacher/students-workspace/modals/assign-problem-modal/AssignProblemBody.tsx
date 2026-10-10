'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import { AssignProblemImagePanel } from './AssignProblemImagePanel';
import { AssignProblemSidePanel } from './AssignProblemSidePanel';
import type { AssignImage } from './types';

export function AssignProblemBody({
  assignFileRef,
  assignImages,
  setAssignImages,
  onFiles,
  assignComment,
  onCommentChange,
  isSendDisabled,
  assigning,
  onSend,
  onClose,
}: {
  assignFileRef: RefObject<HTMLInputElement | null>;
  assignImages: AssignImage[];
  setAssignImages: Dispatch<SetStateAction<AssignImage[]>>;
  onFiles: (files: File[]) => Promise<void>;
  assignComment: string;
  onCommentChange: (value: string) => void;
  isSendDisabled: boolean;
  assigning: boolean;
  onSend: () => void;
  onClose: () => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
      <AssignProblemImagePanel
        assignFileRef={assignFileRef}
        assignImages={assignImages}
        setAssignImages={setAssignImages}
        onFiles={onFiles}
      />
      <AssignProblemSidePanel
        assignComment={assignComment}
        onCommentChange={onCommentChange}
        isSendDisabled={isSendDisabled}
        assigning={assigning}
        onSend={onSend}
        onClose={onClose}
      />
    </div>
  );
}
