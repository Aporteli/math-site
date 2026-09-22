'use client';

import { useMemo } from 'react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { participantUserId } from '@/lib/livekit/participant-identity';

export type AudioDeviceRole = 'primary' | 'secondary' | 'pending';

/**
 * One account can be in the room from several devices. Sound (speaker and
 * microphone) stays on the connection that joined first. Later connections
 * can still publish a camera.
 *
 * `pending` means another connection of this account is here, but join times
 * are not both known yet — callers must not treat that as permission to play.
 */
export function useAudioDeviceRole(): AudioDeviceRole {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  return useMemo(() => {
    const myUserId = participantUserId(localParticipant);
    const others = participants.filter(
      (participant) =>
        participant.sid !== localParticipant.sid &&
        participantUserId(participant) === myUserId,
    );

    if (others.length === 0) return 'primary';

    const myJoined = localParticipant.joinedAt?.getTime();
    if (myJoined === undefined) return 'pending';

    let sawUnknownJoinTime = false;
    for (const participant of others) {
      const joined = participant.joinedAt?.getTime();
      if (joined === undefined) {
        sawUnknownJoinTime = true;
        continue;
      }
      if (joined < myJoined) return 'secondary';
      if (joined === myJoined && participant.sid < localParticipant.sid) return 'secondary';
    }

    return sawUnknownJoinTime ? 'pending' : 'primary';
  }, [localParticipant, participants]);
}
