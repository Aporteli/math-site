'use client';

import { useEffect, useRef } from 'react';
import { RoomAudioRenderer, useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { useAudioDeviceRole } from '../hooks/useAudioDeviceRole';

/**
 * Plays remote audio only on the account's first connection. A later device
 * in the same room would otherwise rebroadcast that sound into the first
 * microphone and howl.
 */
export function PrimaryRoomAudio({ preferSilence }: { preferSilence: boolean }) {
  const role = useAudioDeviceRole();
  if (role === 'secondary') return null;
  // Join times are still settling, and this token was already marked as the
  // later device — stay quiet so the phone speaker cannot feed the first mic.
  if (role === 'pending' && preferSilence) return null;
  return <RoomAudioRenderer />;
}

/** Keeps a later connection from publishing the microphone or stealing the camera on join. */
export function SecondaryCaptureGuard() {
  const role = useAudioDeviceRole();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const releasedAutoCamera = useRef(false);

  useEffect(() => {
    if (role !== 'secondary') return;

    const stopMicrophone = () => {
      if (localParticipant.isMicrophoneEnabled) {
        void localParticipant.setMicrophoneEnabled(false);
      }
    };

    stopMicrophone();
    room.on(RoomEvent.LocalTrackPublished, stopMicrophone);
    room.on(RoomEvent.TrackUnmuted, stopMicrophone);

    return () => {
      room.off(RoomEvent.LocalTrackPublished, stopMicrophone);
      room.off(RoomEvent.TrackUnmuted, stopMicrophone);
    };
  }, [role, room, localParticipant]);

  useEffect(() => {
    if (releasedAutoCamera.current || role !== 'secondary') return;
    releasedAutoCamera.current = true;
    if (localParticipant.isCameraEnabled) {
      void localParticipant.setCameraEnabled(false);
    }
  }, [role, localParticipant]);

  return null;
}

export function SecondaryDeviceNotice() {
  const role = useAudioDeviceRole();
  if (role !== 'secondary') return null;

  return (
    <p className="mx-2 mt-2 shrink-0 rounded-lg bg-amber-500/15 px-2 py-1.5 text-[11px] leading-snug text-amber-200">
      ხმა პირველ მოწყობილობაზე რჩება — აქ არ ისმის და მიკროფონიც გამორთულია.
      ვიდეოს გადასართავად ჩართე კამერა; გამორთვისას ისევ პირველი მოწყობილობის სურათი ჩანს.
    </p>
  );
}
