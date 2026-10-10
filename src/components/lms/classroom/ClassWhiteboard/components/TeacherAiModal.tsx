'use client';

import type { useAskAI } from '../hooks/useAskAI';
import { AiChatModal } from './AiChatModal';

interface Props {
  isTeacher: boolean;
  ask: ReturnType<typeof useAskAI>;
  enableSlashPrompts: boolean;
  slashPromptsUserId: string;
}

export function TeacherAiModal({ isTeacher, ask, enableSlashPrompts, slashPromptsUserId }: Props) {
  if (!isTeacher || !ask.isAiModalOpen) return null;
  return (
    <AiChatModal
      aiModel={ask.aiModel}
      aiModelStatus={ask.aiModelStatus}
      aiInitialImages={ask.aiInitialImages}
      onModelChange={ask.setAiModel}
      onClose={() => {
        ask.setIsAiModalOpen(false);
        ask.setAiInitialImages([]);
      }}
      enableSlashPrompts={enableSlashPrompts}
      slashPromptsUserId={slashPromptsUserId}
    />
  );
}
