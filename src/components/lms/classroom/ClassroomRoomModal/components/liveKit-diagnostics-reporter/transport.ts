import type { Room } from 'livekit-client';
import type { ObservedTransport, TransportSide } from './types';

export function badTransport(state: string): boolean {
  return state === 'failed' || state === 'disconnected' || state === 'closed' || state === 'closing';
}

export function transportOf(room: Room, side: TransportSide): ObservedTransport | null {
  const manager = room.engine.pcManager;
  if (!manager) return null;
  const transport = side === 'publisher' ? manager.publisher : manager.subscriber;
  if (!transport) return null;
  return transport;
}

export function readTransportState(
  transport: ObservedTransport | null,
  read: (value: ObservedTransport) => string,
): string | null {
  if (!transport) return null;
  try {
    const value = read(transport);
    return value || null;
  } catch {
    return null;
  }
}
