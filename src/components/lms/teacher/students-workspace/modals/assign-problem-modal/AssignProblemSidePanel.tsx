'use client';

import { AssignProblemActions } from './AssignProblemActions';
import { AssignProblemCommentField } from './AssignProblemCommentField';

export function AssignProblemSidePanel({
  assignComment,
  onCommentChange,
  isSendDisabled,
  assigning,
  onSend,
  onClose,
}: {
  assignComment: string;
  onCommentChange: (value: string) => void;
  isSendDisabled: boolean;
  assigning: boolean;
  onSend: () => void;
  onClose: () => void;
}) {
  return (
    <div className="md:col-span-5 p-5 flex flex-col justify-between bg-main">
      <AssignProblemCommentField assignComment={assignComment} onChange={onCommentChange} />
      <AssignProblemActions
        isSendDisabled={isSendDisabled}
        assigning={assigning}
        onSend={onSend}
        onClose={onClose}
      />
    </div>
  );
}
