'use client';

import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { TeacherAiChatPanel } from '@/components/lms/problem-bank/teacher-ai-chat-panel';
import { loadAiModelStatusAction } from '@/lib/math/problems/actions';
import { DEFAULT_AI_MODEL, type AiModelId, type AiModelStatus, type ProblemBankCopy } from '@/lib/math/problems';

export function SiteAiChatWidget({
  copy,
  enableSlashPrompts = false,
  slashPromptsUserId = '',
}: {
  copy: ProblemBankCopy;
  enableSlashPrompts?: boolean;
  slashPromptsUserId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState<AiModelId>(DEFAULT_AI_MODEL);
  const [modelStatus, setModelStatus] = useState<AiModelStatus[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadAiModelStatusAction().then((status) => {
      if (!cancelled) setModelStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // მოდალის ჩართვა/გამორთვის ივენთების მოსმენა
  useEffect(() => {
    const handleHide = () => {
      setIsModalOpen(true);
      setOpen(false);
    };
    const handleShow = () => {
      setIsModalOpen(false);
    };

    window.addEventListener('hide-ai-widget', handleHide);
    window.addEventListener('show-ai-widget', handleShow);

    return () => {
      window.removeEventListener('hide-ai-widget', handleHide);
      window.removeEventListener('show-ai-widget', handleShow);
    };
  }, []);

  // თუ მოდალი გახსნილია ან მოდელები არ არის, არ დარენდერდეს
  if (isModalOpen || !modelStatus || modelStatus.length === 0) return null;

  return (
    <>
      <button
        type="button"
        aria-label={copy.chat.open}
        title={copy.chat.open}
        onClick={() => setOpen(true)}
        className="fixed right-5 bottom-5 z-[1000000] flex h-12 w-12 px-3 items-center justify-center gap-2 rounded-full bg-navy text-sm font-semibold text-white shadow-lg transition-colors hover:bg-navy-strong focus:outline-none focus:ring-2 focus:ring-navy/25 focus:ring-offset-2 focus:ring-offset-paper">
        <MessageSquare className="size-5" />
        <span className="text-center hidden sm:inline">{copy.chat.launcher}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[1000001] flex items-end justify-end bg-ink/35 p-3 sm:items-center sm:justify-center sm:p-6">
          <button
            type="button"
            aria-label={copy.chat.close}
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-4xl">
            <TeacherAiChatPanel
              copy={copy.chat}
              fullCopy={copy}
              model={model}
              onModelChange={setModel}
              modelStatus={modelStatus}
              onClose={() => setOpen(false)}
              showSaveToLab
              enableSlashPrompts={enableSlashPrompts}
              slashPromptsUserId={slashPromptsUserId}
              className="max-h-[min(85vh,56rem)] overflow-y-auto"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}