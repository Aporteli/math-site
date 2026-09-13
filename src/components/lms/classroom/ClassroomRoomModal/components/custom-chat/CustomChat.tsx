'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@livekit/components-react';
import { ChatHeader } from './ChatHeader';
import { ChatMessageList } from './ChatMessageList';
import { ChatComposer } from './ChatComposer';
import { useChatHistory } from '../custom-chat/use-chat-history';
import { useChatImageUpload } from '../custom-chat/use-chat-image-upload';

interface CustomChatProps {
  courseId: string;
  isAdmin?: boolean;
}

export function CustomChat({ courseId, isAdmin = true }: CustomChatProps) {
  const { chatMessages, send, isSending } = useChat();
  const [draft, setDraft] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const { savedMessages, clearHistory } = useChatHistory(courseId, chatMessages);
  const { isUploading, fileInputRef, handleImageUpload, handlePaste } =
    useChatImageUpload(send);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [savedMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;

    await send(draft);
    setDraft('');
  };

  return (
    <div
      onPaste={handlePaste}
      className="flex h-full w-full flex-col rounded-2xl border border-white/10 bg-slate-900 overflow-hidden outline-none focus:border-emerald-500/50"
      tabIndex={0}
    >
      <ChatHeader
        isUploading={isUploading}
        canClear={isAdmin && savedMessages.length > 0}
        onClear={clearHistory}
      />

      <ChatMessageList messages={savedMessages} bottomRef={chatBottomRef} />

      <ChatComposer
        draft={draft}
        setDraft={setDraft}
        onSubmit={handleSend}
        isSending={isSending}
        isUploading={isUploading}
        fileInputRef={fileInputRef}
        onImageUpload={handleImageUpload}
      />
    </div>
  );
}