import 'server-only';
import {
  ParticipantInfo_State,
  TrackSource,
  type ParticipantInfo,
  type Room,
} from 'livekit-server-sdk';
import { isAuxiliaryParticipant } from '@/lib/livekit/participant-identity';
import { getLiveKitEnv } from '@/lib/livekit/livekit-env';
import type { ServerParticipantSnapshot, ServerRoomSnapshot } from '@/lib/livekit/diagnostics/model';

const DISCONNECT_REASONS = [
  'UNKNOWN_REASON',
  'CLIENT_INITIATED',
  'DUPLICATE_IDENTITY',
  'SERVER_SHUTDOWN',
  'PARTICIPANT_REMOVED',
  'ROOM_DELETED',
  'STATE_MISMATCH',
  'JOIN_FAILURE',
  'MIGRATION',
  'SIGNAL_CLOSE',
  'ROOM_CLOSED',
  'USER_UNAVAILABLE',
  'USER_REJECTED',
  'SIP_TRUNK_FAILURE',
  'CONNECTION_TIMEOUT',
  'MEDIA_FAILURE',
] as const;

const cache = new Map<string, { at: number; snapshot: ServerRoomSnapshot }>();
const SNAPSHOT_TTL_MS = 15_000;

function stateName(state: ParticipantInfo_State): string {
  switch (state) {
    case ParticipantInfo_State.JOINING:
      return 'JOINING';
    case ParticipantInfo_State.JOINED:
      return 'JOINED';
    case ParticipantInfo_State.ACTIVE:
      return 'ACTIVE';
    case ParticipantInfo_State.DISCONNECTED:
      return 'DISCONNECTED';
    default:
      return 'UNKNOWN';
  }
}

function reasonName(value: number, state: ParticipantInfo_State): string | null {
  if (state !== ParticipantInfo_State.DISCONNECTED || value <= 0) return null;
  return DISCONNECT_REASONS[value] ?? `DISCONNECT_${value}`;
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function mapParticipant(participant: ParticipantInfo): ServerParticipantSnapshot {
  const audioPublished = participant.tracks.some(
    (track) => track.source === TrackSource.MICROPHONE && !track.muted,
  );
  return {
    identity: participant.identity,
    name: emptyToNull(participant.name) ?? 'Participant',
    state: stateName(participant.state),
    region: emptyToNull(participant.region),
    isPublisher: participant.isPublisher,
    audioPublished,
    disconnectReason: reasonName(participant.disconnectReason, participant.state),
  };
}

function roomCount(room: Room): number | null {
  return typeof room.numParticipants === 'number' ? room.numParticipants : null;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function captureServerSnapshot(roomName: string): Promise<ServerRoomSnapshot | null> {
  const env = getLiveKitEnv();
  if (!env) return null;
  try {
    const rooms = await withTimeout(env.roomService.listRooms([roomName]), 2500);
    const room = rooms[0];
    if (!room) {
      return {
        checkedAt: new Date().toISOString(),
        roomExists: false,
        participantCount: 0,
        participants: [],
      };
    }
    const people = await withTimeout(env.roomService.listParticipants(roomName), 2500);
    const participants = people
      .filter((participant) => !isAuxiliaryParticipant(participant))
      .map(mapParticipant);
    return {
      checkedAt: new Date().toISOString(),
      roomExists: true,
      participantCount: roomCount(room),
      participants,
    };
  } catch (error) {
    console.info(
      JSON.stringify({
        scope: 'livekit-diagnostics',
        event: 'server_snapshot_unavailable',
        room: roomName,
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'unknown',
      }),
    );
    return null;
  }
}

export async function getServerSnapshot(roomName: string, force: boolean): Promise<ServerRoomSnapshot | null> {
  const cached = cache.get(roomName);
  if (!force && cached && Date.now() - cached.at < SNAPSHOT_TTL_MS) return cached.snapshot;
  const snapshot = await captureServerSnapshot(roomName);
  if (snapshot) cache.set(roomName, { at: Date.now(), snapshot });
  return snapshot;
}
