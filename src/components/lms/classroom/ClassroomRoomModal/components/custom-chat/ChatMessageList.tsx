'use client';

import type { ReceivedChatMessage } from '@livekit/components-react';
import { ChatMessage } from './ChatMessage';

interface ChatMessageListProps {
  messages: ReceivedChatMessage[];
  bottomRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatMessageList({ messages, bottomRef }: ChatMessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-xs text-white/30">
          ჩატის ისტორია ცარიელია
        </div>
      ) : (
        messages.map((msg, index) => (
          <ChatMessage key={msg.timestamp || index} msg={msg} />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}