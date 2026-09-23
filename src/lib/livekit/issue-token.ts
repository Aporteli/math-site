import { randomUUID } from 'node:crypto';
import { AccessToken, type RoomServiceClient } from 'livekit-server-sdk';
import {
  CONNECTION_ID_SUFFIX_LENGTH,
  PARTICIPANT_ROLE,
  PARTICIPANT_USER_ID,
  participantUserId,
} from '@/lib/livekit/participant-identity';

interface IssueTokenOptions {
  apiKey: string;
  apiSecret: string;
  userId: string;
  userName: string;
  role: string;
  roomName: string;
  canPublish: boolean;
  canSubscribe: boolean;
  canPublishData: boolean;
  hidden?: boolean;
}

export async function issueRoomToken(options: IssueTokenOptions): Promise<string> {
  const token = new AccessToken(options.apiKey, options.apiSecret, {
    identity: `${options.userId}:${randomUUID().slice(0, CONNECTION_ID_SUFFIX_LENGTH)}`,
    name: options.userName,
    ttl: '12h',
    attributes: {
      [PARTICIPANT_USER_ID]: options.userId,
      [PARTICIPANT_ROLE]: options.role,
    },
  });

  token.addGrant({
    roomJoin: true,
    room: options.roomName,
    canPublish: options.canPublish,
    canSubscribe: options.canSubscribe,
    canPublishData: options.canPublishData,
    hidden: options.hidden ?? false,
  });

  return token.toJwt();
}

/** Another device of this account is already in the room as a real participant. */
export async function hasRealAccountConnection(
  roomService: RoomServiceClient,
  roomName: string,
  userId: string,
): Promise<boolean> {
  try {
    const participants = await roomService.listParticipants(roomName);
    return participants.some((participant) => {
      if (participantUserId(participant) !== userId) return false;
      const role = (participant.attributes?.[PARTICIPANT_ROLE] || '').toLowerCase();
      return role !== 'monitor' && role !== 'board';
    });
  } catch {
    return false;
  }
}

export async function ensureLiveKitRoom(
  roomService: RoomServiceClient,
  roomName: string,
  emptyTimeoutSeconds: number,
): Promise<void> {
  try {
    const existing = await roomService.listRooms([roomName]);
    if (existing.length > 0) return;
  } catch {
    // Fall through and create the room.
  }

  try {
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: emptyTimeoutSeconds,
      maxParticipants: 50,
    });
  } catch {
    // Room already exists.
  }
}
