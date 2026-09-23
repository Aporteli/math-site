'use client';

import { useEffect, useRef } from 'react';
import { Room, RoomEvent, RemoteAudioTrack, Track } from 'livekit-client';
import type { RemoteTrack, RemoteTrackPublication } from 'livekit-client';
import { BREAKOUT_TOPIC, type BreakoutRoomKey } from '@/lib/livekit/breakout';
import {
  isAuxiliaryParticipant,
  isStaffParticipant,
  participantUserId,
} from '@/lib/livekit/participant-identity';
import { applyRemoteVolume } from './apply-remote-volume';
import { useBreakout, type PresencePerson } from './BreakoutContext';

interface MonitorRoomProps {
  token: string;
  roomKey: BreakoutRoomKey;
}

/**
 * Subscribe-only connection. The token cannot publish, so students in this
 * room never hear the teacher through it. Audio is played only on this client.
 */
export function MonitorRoom({ token, roomKey }: MonitorRoomProps) {
  const { heardVolume, registerMonitor, requestSync, setMonitorBlocked, setPresence } = useBreakout();
  const roomRef = useRef<Room | null>(null);
  const heardVolumeRef = useRef(heardVolume);
  heardVolumeRef.current = heardVolume;

  useEffect(() => {
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    let cancelled = false;
    const unregister = registerMonitor(room);

    const publishPresence = () => {
      const byUser = new Map<string, PresencePerson>();
      for (const participant of room.remoteParticipants.values()) {
        if (isStaffParticipant(participant) || isAuxiliaryParticipant(participant)) continue;
        const userId = participantUserId(participant);
        const current = byUser.get(userId);
        byUser.set(userId, {
          userId,
          name: participant.name || current?.name || userId,
          speaking: Boolean(current?.speaking || participant.isSpeaking),
        });
      }
      setPresence(roomKey, 'monitor', [...byUser.values()]);
    };

    const applyVolume = () => {
      applyRemoteVolume(room, (userId) => heardVolumeRef.current(userId, roomKey));
    };

    const subscribeAudio = (publication: RemoteTrackPublication) => {
      if (publication.kind === Track.Kind.Audio && !publication.isSubscribed) {
        void publication.setSubscribed(true);
      }
    };

    const onSubscribed = (track: RemoteTrack) => {
      if (!(track instanceof RemoteAudioTrack)) return;
      const element = track.attach();
      element.autoplay = true;
      applyVolume();
    };

    const onPublished = (publication: RemoteTrackPublication) => subscribeAudio(publication);

    const onPlayback = () => setMonitorBlocked(roomKey, !room.canPlaybackAudio);

    const onData = (payload: Uint8Array, _participant: unknown, _kind: unknown, topic?: string) => {
      if (topic !== BREAKOUT_TOPIC) return;
      try {
        const message = JSON.parse(new TextDecoder().decode(payload)) as { type?: string };
        if (message.type !== 'BREAKOUT_SYNC') return;
      } catch {
        return;
      }
      void requestSync();
    };

    room
      .on(RoomEvent.TrackPublished, onPublished)
      .on(RoomEvent.TrackSubscribed, onSubscribed)
      .on(RoomEvent.ParticipantConnected, publishPresence)
      .on(RoomEvent.ParticipantDisconnected, publishPresence)
      .on(RoomEvent.ActiveSpeakersChanged, publishPresence)
      .on(RoomEvent.AudioPlaybackStatusChanged, onPlayback)
      .on(RoomEvent.DataReceived, onData);

    const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (url) {
      void room.connect(url, token, { autoSubscribe: false }).then(() => {
        if (cancelled) return;
        for (const participant of room.remoteParticipants.values()) {
          for (const publication of participant.audioTrackPublications.values()) {
            subscribeAudio(publication);
          }
        }
        void room.startAudio().then(onPlayback).catch(onPlayback);
        publishPresence();
        applyVolume();
      });
    }

    return () => {
      cancelled = true;
      unregister();
      setPresence(roomKey, 'monitor', []);
      setMonitorBlocked(roomKey, false);
      room.disconnect();
      roomRef.current = null;
    };
  }, [registerMonitor, requestSync, roomKey, setMonitorBlocked, setPresence, token]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room) return;
    applyRemoteVolume(room, (userId) => heardVolume(userId, roomKey));
  }, [heardVolume, roomKey]);

  return null;
}
