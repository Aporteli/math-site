import type { DiagnosticsSession } from './session';
import { badTransport } from './transport';
import type { TransportSide } from './types';

export function bindObservePc(session: DiagnosticsSession): void {
  session.observePc = (side: TransportSide, next: string | null) => {
    if (!next || next === session.lastPc[side]) return;
    const previous = session.lastPc[side];
    session.lastPc[side] = next;
    if (previous === null && !badTransport(next)) return;
    session.push('pc_state_changed', {
      side,
      pc: next,
      previousPc: previous,
      message: `${side === 'publisher' ? 'Publisher' : 'Subscriber'} WebRTC state changed`,
    });
    session.requestFlush();
  };
}
