import { DisconnectReason } from 'livekit-client';

export const VOLUNTARY = new Set<DisconnectReason>([
  DisconnectReason.CLIENT_INITIATED,
  DisconnectReason.ROOM_DELETED,
  DisconnectReason.ROOM_CLOSED,
]);
