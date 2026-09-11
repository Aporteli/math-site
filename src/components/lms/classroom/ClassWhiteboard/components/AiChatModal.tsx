'use client';

import { TeacherAiChatPanel } from '@/components/lms/teacher/problem-bank/components/TeacherAiChatPanel';
import type { AiModelId, AiModelStatus } from '@/lib/math/problems';
import { DEFAULT_AI_COPY } from '../constants/aiCopy';

interface Props {
  aiModel: AiModelId;
  aiModelStatus: AiModelStatus[] | null;
  aiInitialImages: string[];
  onModelChange: (m: AiModelId) => void;
  onClose: () => void;
}

export function AiChatModal({ aiModel, aiModelStatus, aiInitialImages, onModelChange, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[1000001] flex items-end justify-end bg-slate-950/50 p-3 sm:items-center sm:justify-center sm:p-6 backdrop-blur-xs animate-in fade-in duration-150">
      <button type="button" aria-label="დახურვა" className="absolute inset-0 cursor-default bg-transparent" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        <TeacherAiChatPanel
          copy={DEFAULT_AI_COPY.chat}
          fullCopy={DEFAULT_AI_COPY}
          model={aiModel}
          onModelChange={onModelChange}
          modelStatus={aiModelStatus || []}
          initialImagesBase64={aiInitialImages}
          onClose={onClose}
          showSaveToLab={true}
          className="max-h-[min(85vh,56rem)] overflow-y-auto"
        />
      </div>
    </div>
  );
}