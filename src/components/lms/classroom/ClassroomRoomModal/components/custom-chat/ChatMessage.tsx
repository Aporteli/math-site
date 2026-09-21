'use client';

import type { ReceivedChatMessage } from '@livekit/components-react';

export function ChatMessage({ msg }: { msg: ReceivedChatMessage }) {
  const isImage = msg.message.startsWith('[IMAGE:') && msg.message.endsWith(']');
  const imageUrl = isImage ? msg.message.slice(7, -1) : null;

  return (
    <div className="flex flex-col text-xs">
      <div className="mb-1 flex items-center gap-2">
        <span className="font-medium text-emerald-400">
          {msg.from?.identity || 'ანონიმი'}
        </span>
        <span className="text-[10px] text-white/40">
          {new Date(msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {isImage && imageUrl ? (
        <div className="max-w-[80%] overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1">
          <img
            src={imageUrl}
            alt="ჩატის სურათი"
            className="max-h-60 w-full rounded-lg object-cover"
          />
        </div>
      ) : (
        <p className="w-fit max-w-[85%] break-words rounded-lg border border-white/5 bg-white/5 p-2 text-white/90">
          {msg.message}
        </p>
      )}
    </div>
  );
}