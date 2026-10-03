'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RoomAudioRenderer, StartAudio, useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { RoomEvent, Track } from 'livekit-client';
import { useAudioDeviceRole } from '../hooks/useAudioDeviceRole';

export function PrimaryRoomAudio({ preferSilence }: { preferSilence: boolean }) {
  const role = useAudioDeviceRole();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (role === 'secondary') return null;
  if (role === 'pending' && preferSilence) return null;
  if (!mounted) return null;

  // The video panel is `display: none` on the board tab. Audio tags inside it
  // stop or get very quiet in some browsers, so one student loses the teacher.
  return createPortal(
    <>
      <RoomAudioRenderer />
      <StartAudio
        label="ხმის ჩასართავად დააჭირე"
        className="fixed bottom-4 left-1/2 z-[100000] -translate-x-1/2 cursor-pointer rounded-box bg-[#A66A32] px-4 py-2 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_5px_rgba(166,106,50,0.22)]"
      />
    </>,
    document.body,
  );
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

  useEffect(() => {
    if (role !== 'secondary') return;

    const preferDetail = () => {
      const mediaTrack = localParticipant
        .getTrackPublication(Track.Source.Camera)
        ?.track?.mediaStreamTrack;
      if (mediaTrack && mediaTrack.contentHint !== 'detail') {
        mediaTrack.contentHint = 'detail';
      }
    };

    preferDetail();
    room.on(RoomEvent.LocalTrackPublished, preferDetail);
    room.on(RoomEvent.TrackUnmuted, preferDetail);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, preferDetail);
      room.off(RoomEvent.TrackUnmuted, preferDetail);
    };
  }, [role, room, localParticipant]);

  return null;
}

export function SecondaryDeviceNotice() {
  const role = useAudioDeviceRole();
  if (role !== 'secondary') return null;

  return (
    <p className="mx-2 mt-2 shrink-0 rounded-box bg-amber-500/15 px-2 py-1.5 text-[11px] leading-snug text-amber-200">
      ხმა პირველ მოწყობილობაზე რჩება — აქ არ ისმის და მიკროფონიც გამორთულია.
      ვიდეოს გადასართავად ჩართე კამერა; გამორთვისას ისევ პირველი მოწყობილობის სურათი ჩანს.
    </p>
  );
}
