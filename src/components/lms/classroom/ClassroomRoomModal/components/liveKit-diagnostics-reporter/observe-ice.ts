import type { DiagnosticsSession } from './session';
import { badTransport } from './transport';
import type { TransportSide } from './types';

export function bindObserveIce(session: DiagnosticsSession): void {
  session.observeIce = (side: TransportSide, next: string | null) => {
    if (!next || next === session.lastIce[side]) return;
    const previous = session.lastIce[side];
    session.lastIce[side] = next;
    if (previous === null && !badTransport(next)) return;
    session.push('ice_state_changed', {
      side,
      ice: side === 'publisher' ? next : session.lastIce.publisher,
      previousIce: side === 'publisher' ? previous : undefined,
      subscriberIce: side === 'subscriber' ? next : undefined,
      previousSubscriberIce: side === 'subscriber' ? previous : undefined,
      message: `${side === 'publisher' ? 'Publisher' : 'Subscriber'} ICE state changed`,
    });
    session.requestFlush();
  };
}
