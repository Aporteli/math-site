'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { AssignBoardModal } from './AssignBoardModal';
import { ClearBoardDialog } from './ClearBoardDialog';
import type { WhiteboardCopy } from './types';
import { useTeacherWhiteboard } from './useTeacherWhiteboard';
import { WhiteboardPageBar } from './WhiteboardPageBar';
import { WhiteboardToolbar } from './WhiteboardToolbar';
import { WhiteboardViewport } from './WhiteboardViewport';

const ClassroomAiModal = dynamic(
  () => import('@/components/lms/classroom/ClassroomAiModal').then((m) => m.ClassroomAiModal),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <Loader2 className="size-8 animate-spin text-white" />
      </div>
    ),
  },
);

export function TeacherWhiteboard({ copy }: { copy: WhiteboardCopy }) {
  const model = useTeacherWhiteboard();
  const { boardRootRef, fileInputRef, addImage, isAssignModalOpen, isAiModalOpen, setIsAiModalOpen, isClearConfirmOpen } =
    model;

  return (
    <div
      ref={boardRootRef}
      className="relative flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden rounded-box border border-hairline bg-main shadow-sm">
      <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (ev.target?.result) addImage(ev.target.result as string);
            };
            reader.readAsDataURL(file);
            e.target.value = '';
          }
        }}
      />
      <WhiteboardToolbar model={model} copy={copy} />
      <WhiteboardViewport model={model} copy={copy} />
      <WhiteboardPageBar model={model} copy={copy} />
      {isAssignModalOpen && <AssignBoardModal model={model} />}
      {isAiModalOpen && <ClassroomAiModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} />}
      {isClearConfirmOpen && <ClearBoardDialog model={model} copy={copy} />}
    </div>
  );
}
