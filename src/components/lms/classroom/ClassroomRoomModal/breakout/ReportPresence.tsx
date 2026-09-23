'use client';

import { useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import type { RemoteParticipant } from 'livekit-client';
import {
  isAuxiliaryParticipant,
  isStaffParticipant,
  participantUserId,
} from '@/lib/livekit/participant-identity';
import type { BreakoutRoomKey } from '@/lib/livekit/breakout';
import { useBreakout, type PresencePerson } from './BreakoutContext';

function peopleFrom(participants: Iterable<RemoteParticipant>): PresencePerson[] {
  const byUser = new Map<string, PresencePerson>();
  for (const participant of participants) {
    if (isStaffParticipant(participant) || isAuxiliaryParticipant(participant)) continue;
    const userId = participantUserId(participant);
    const current = byUser.get(userId);
    byUser.set(userId, {
      userId,
      name: participant.name || current?.name || userId,
      speaking: Boolean(current?.speaking || participant.isSpeaking),
    });
  }
  return [...byUser.values()];
}

export function ReportPresence({ roomKey }: { roomKey: BreakoutRoomKey }) {
  const room = useRoomContext();
  const { setPresence } = useBreakout();

  useEffect(() => {
    const publish = () => setPresence(roomKey, 'primary', peopleFrom(room.remoteParticipants.values()));
    publish();
    room.on(RoomEvent.ParticipantConnected, publish);
    room.on(RoomEvent.ParticipantDisconnected, publish);
    room.on(RoomEvent.ActiveSpeakersChanged, publish);
    return () => {
      room.off(RoomEvent.ParticipantConnected, publish);
      room.off(RoomEvent.ParticipantDisconnected, publish);
      room.off(RoomEvent.ActiveSpeakersChanged, publish);
      setPresence(roomKey, 'primary', []);
    };
  }, [room, roomKey, setPresence]);

  return null;
}
