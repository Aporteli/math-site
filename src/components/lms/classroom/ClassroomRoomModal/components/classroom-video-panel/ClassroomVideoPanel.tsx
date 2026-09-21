'use client';

import { useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { RefreshCw } from 'lucide-react';
import { DisconnectReason } from 'livekit-client';
import { AudioIsolationListener } from '../AudioIsolationListener';
import { ChatBackgroundListener } from '../ChatBackgroundListener';
import { ConnectionStatusBadge } from '../ConnectionStatusBadge';
import { ControlBar } from './ControlBar';
import { AudioVolumeProvider } from './AudioVolumeContext';
import { CustomChat } from '../custom-chat/CustomChat';
import { RoomInstanceBridge } from '../RoomInstanceBridge';
import { MyVideoGrid } from '../video-grid/MyVideoGrid';
import type { ClassroomVideoPanelProps } from './types';
import '@livekit/components-styles';

/** Disconnects worth explaining instead of silently closing the whole classroom. */
const DISCONNECT_NOTICE: Partial<Record<DisconnectReason, string>> = {
  [DisconnectReason.DUPLICATE_IDENTITY]:
    'ამ ექაუნთით ზარი სხვა მოწყობილობაზე ან ტაბშია გახსნილი. აქ შესვლისას იქაური კავშირი გაითიშება.',
  [DisconnectReason.PARTICIPANT_REMOVED]: 'მასწავლებელმა ოთახიდან ამოგიყვანა.',
  [DisconnectReason.ROOM_DELETED]: 'ოთახი დაიხურა.',
};

export function ClassroomVideoPanel({
  token,
  courseId,
  isTeacher,
  onClose,
  onRoom,
}: ClassroomVideoPanelProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isolatedIdentities, setIsolatedIdentities] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  /** Remount key: lets the user reconnect with the same token. */
  const [connectAttempt, setConnectAttempt] = useState(0);

  const handleDisconnected = (reason?: DisconnectReason) => {
    const message = reason !== undefined ? DISCONNECT_NOTICE[reason] : undefined;
    if (message) {
      setNotice(message);
      return;
    }
    onClose();
  };

  if (notice) {
    return (
      <div className="flex h-full w-full flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm font-semibold text-white/90">{notice}</p>
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setConnectAttempt((attempt) => attempt + 1);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
        >
          <RefreshCw className="size-4" />
          თავიდან შესვლა
        </button>
      </div>
    );
  }

  return (
    <LiveKitRoom
      key={connectAttempt}
      video
      audio
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      options={{ videoCaptureDefaults: { resolution: { width: 1280, height: 720 } } }}
      data-lk-theme="default"
      className="flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden"
      onDisconnected={handleDisconnected}
    >
      <AudioVolumeProvider>
        <RoomInstanceBridge onRoom={onRoom} />
        <AudioIsolationListener isTeacher={isTeacher} />
        <ChatBackgroundListener courseId={courseId} />

        <div className="absolute top-2 left-2 z-10">
          <ConnectionStatusBadge />
        </div>

        {isChatOpen ? (
          <div className="relative flex-1 min-h-0 w-full overflow-hidden p-2">
            <CustomChat courseId={courseId} />
          </div>
        ) : (
          <MyVideoGrid />
        )}

        <ControlBar
          isChatOpen={isChatOpen}
          onToggleChat={() => setIsChatOpen((p) => !p)}
          isTeacher={isTeacher}
          courseId={courseId}
          isolatedIdentities={isolatedIdentities}
          onIsolationChange={setIsolatedIdentities}
        />

        <RoomAudioRenderer />
      </AudioVolumeProvider>
    </LiveKitRoom>
  );
}