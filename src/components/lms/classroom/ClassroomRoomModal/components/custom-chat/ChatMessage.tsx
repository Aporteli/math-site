'use client';

import type { ReceivedChatMessage } from '@livekit/components-react';

export function ChatMessage({ msg }: { msg: ReceivedChatMessage }) {
  const isImage = msg.message.startsWith('[IMAGE:') && msg.message.endsWith(']');
  const imageUrl = isImage ? msg.message.slice(7, -1) : null;

  return (
    <div className="flex flex-col text-xs">
      <div className="mb-1 flex items-center gap-2">
        <span className="font-bold text-navy">
          {msg.from?.identity || 'ანონიმი'}
        </span>
        <span className="text-[10px] font-medium text-muted">
          {new Date(msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {isImage && imageUrl ? (
        <div className="max-w-[80%] overflow-hidden rounded-box border border-hairline bg-sectionHeader p-1">
          <img
            src={imageUrl}
            alt="ჩატის სურათი"
            className="max-h-60 w-full rounded-box object-cover"
          />
        </div>
      ) : (
        <p className="w-fit max-w-[85%] break-words rounded-box border border-hairline bg-sectionHeader p-2 text-ink">
          {msg.message}
        </p>
      )}
    </div>
  );
}