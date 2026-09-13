'use client';

import { useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
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

export function ClassroomVideoPanel({
  token,
  courseId,
  isTeacher,
  onClose,
  onRoom,
}: ClassroomVideoPanelProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isolatedIdentities, setIsolatedIdentities] = useState<string[]>([]);

  return (
    <LiveKitRoom
      video
      audio
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      options={{ videoCaptureDefaults: { resolution: { width: 1280, height: 720 } } }}
      data-lk-theme="default"
      className="flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden"
      onDisconnected={onClose}
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