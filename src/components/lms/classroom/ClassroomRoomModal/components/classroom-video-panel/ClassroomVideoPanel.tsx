'use client';

import { useState } from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import { RefreshCw } from 'lucide-react';
import {
  DisconnectReason,
  VideoPresets,
  type TrackPublishDefaults,
  type VideoCaptureOptions,
} from 'livekit-client';
import { AudioIsolationListener } from '../AudioIsolationListener';
import { ChatBackgroundListener } from '../ChatBackgroundListener';
import { ConnectionStatusBadge } from '../ConnectionStatusBadge';
import { OwnDeviceAudioListener } from '../OwnDeviceAudioListener';
import {
  PrimaryRoomAudio,
  SecondaryCaptureGuard,
  SecondaryDeviceNotice,
} from '../PrimaryDeviceAudio';
import { ControlBar } from './ControlBar';
import { AudioVolumeProvider } from './AudioVolumeContext';
import { CustomChat } from '../custom-chat/CustomChat';
import { LiveKitDiagnosticsReporter } from '../liveKit-diagnostics-reporter/LiveKitDiagnosticsReporter';
import { RoomInstanceBridge } from '../RoomInstanceBridge';
import { MyVideoGrid } from '../video-grid/MyVideoGrid';
import { ApplyListenMix } from '../../breakout/ApplyListenMix';
import { BreakoutSignal } from '../../breakout/BreakoutSignal';
import { ReportPresence } from '../../breakout/ReportPresence';
import { useBreakout } from '../../breakout/BreakoutContext';
import type { ClassroomVideoPanelProps } from './types';
import '@livekit/components-styles';

const primaryVideoCapture: VideoCaptureOptions = {
  resolution: { width: 1280, height: 720 },
};

/**
 * The later device is the phone camera. Exact 1280×720 makes that camera scale
 * a small native frame up, and simulcast then leaves students on the lowest
 * layer, so the feed looks blurry. Ideal capture and one full-resolution
 * encoding stay sharp. The first device is unchanged.
 */
const secondaryVideoCapture = {
  resolution: { width: 1280, height: 720 },
  width: { ideal: 1280, max: 1280 },
  height: { ideal: 720, max: 720 },
  frameRate: { ideal: 30 },
} as VideoCaptureOptions;

const secondaryPublishDefaults: TrackPublishDefaults = {
  dtx: false,
  simulcast: false,
  degradationPreference: 'maintain-resolution',
  videoEncoding: VideoPresets.h720.encoding,
};

/** Reasons that end the session. Everything else stays in the classroom so the user can reconnect. */
const DISCONNECT_NOTICE: Partial<Record<DisconnectReason, string>> = {
  [DisconnectReason.DUPLICATE_IDENTITY]:
    'კავშირი გაწყდა: იგივე სესია სხვაგან დაუკავშირდა. სცადეთ თავიდან შესვლა.',
  [DisconnectReason.PARTICIPANT_REMOVED]: 'მასწავლებელმა ოთახიდან ამოგიყვანა.',
  [DisconnectReason.ROOM_DELETED]: 'ოთახი დაიხურა.',
  [DisconnectReason.ROOM_CLOSED]: 'ოთახი დაიხურა.',
};

const RECOVERABLE_DISCONNECT = new Set<DisconnectReason>([
  DisconnectReason.UNKNOWN_REASON,
  DisconnectReason.SERVER_SHUTDOWN,
  DisconnectReason.STATE_MISMATCH,
  DisconnectReason.JOIN_FAILURE,
  DisconnectReason.MIGRATION,
  DisconnectReason.SIGNAL_CLOSE,
  DisconnectReason.CONNECTION_TIMEOUT,
  DisconnectReason.MEDIA_FAILURE,
]);

const RECOVERABLE_NOTICE = 'კავშირი გაწყდა. სცადეთ თავიდან შესვლა.';

export function ClassroomVideoPanel({
  token,
  courseId,
  isTeacher,
  secondary = false,
  onClose,
  onRoom,
  expanded = false,
}: ClassroomVideoPanelProps) {
  const breakout = useBreakout();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isolatedIdentities, setIsolatedIdentities] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  /** Remount key: lets the user reconnect with the same token. */
  const [connectAttempt, setConnectAttempt] = useState(0);

  const handleDisconnected = (reason?: DisconnectReason) => {
    if (Date.now() < breakout.ignoreDisconnectUntil.current) return;
    // Unmount and breakout moves disconnect on purpose. The header closes the class itself.
    if (reason === DisconnectReason.CLIENT_INITIATED) return;
    const message = reason !== undefined ? DISCONNECT_NOTICE[reason] : undefined;
    if (message) {
      setNotice(message);
      return;
    }
    if (reason === undefined || RECOVERABLE_DISCONNECT.has(reason)) {
      setNotice(RECOVERABLE_NOTICE);
      return;
    }
    onClose();
  };

  if (notice) {
    return (
      <div className="flex h-full w-full flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm font-bold text-ink">{notice}</p>
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setConnectAttempt((attempt) => attempt + 1);
          }}
          className="inline-flex cursor-pointer items-center gap-2 rounded-box bg-[#465D73] px-3 py-2 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] active:scale-[0.98]"
        >
          <RefreshCw className="size-4" />
          თავიდან შესვლა
        </button>
      </div>
    );
  }

  return (
    <LiveKitRoom
      key={`${breakout.roomKey}:${connectAttempt}:${token.slice(-12)}`}
      // მეორეული კავშირი ჩუმად შემოდის: ხმა პირველ მოწყობილობაზე რჩება,
      // კამერა კი ღილაკით გადააქვთ.
      video={!secondary}
      audio={!secondary}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      options={{
        // Tiles are ~260px wide. Match subscribed quality to the element, and
        // stop publishing layers nobody is watching.
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: secondary ? secondaryVideoCapture : primaryVideoCapture,
        audioCaptureDefaults: {
          voiceIsolation: false,
        },
        publishDefaults: secondary ? secondaryPublishDefaults : { dtx: false, simulcast: true },
      }}
      data-lk-theme="default"
      className="flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden"
      onDisconnected={handleDisconnected}
      onConnected={breakout.markMediaConnected}
    >
      <AudioVolumeProvider>
        <LiveKitDiagnosticsReporter courseId={courseId} secondary={secondary} />
        {breakout.roomKey === 'main' && <RoomInstanceBridge onRoom={onRoom} />}
        <BreakoutSignal />
        {isTeacher && <ReportPresence roomKey={breakout.roomKey} />}
        {isTeacher && breakout.breakout.active && <ApplyListenMix />}
        <AudioIsolationListener isTeacher={isTeacher} />
        <OwnDeviceAudioListener />
        <SecondaryCaptureGuard />
        <ChatBackgroundListener courseId={courseId} />

        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          <ConnectionStatusBadge />
          {breakout.roomKey !== 'main' && (
            <span className="rounded-box bg-[#A66A32] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
              {breakout.roomKey === 'a' ? 'ოთახი A' : 'ოთახი B'}
            </span>
          )}
          {breakout.moving && (
            <span className="rounded-box border border-hairline bg-sectionHeader px-1.5 py-0.5 text-[10px] font-bold text-mainText">
              გადასვლა...
            </span>
          )}
        </div>

        <SecondaryDeviceNotice />

        {isChatOpen ? (
          <div className="relative flex-1 min-h-0 w-full overflow-hidden p-2">
            <CustomChat courseId={courseId} />
          </div>
        ) : (
          <MyVideoGrid expanded={expanded} />
        )}

        <ControlBar
          isChatOpen={isChatOpen}
          onToggleChat={() => setIsChatOpen((p) => !p)}
          isTeacher={isTeacher}
          courseId={courseId}
          isolatedIdentities={isolatedIdentities}
          onIsolationChange={setIsolatedIdentities}
          secondary={secondary}
        />

        <PrimaryRoomAudio preferSilence={secondary} />
      </AudioVolumeProvider>
    </LiveKitRoom>
  );
}