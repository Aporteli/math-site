import type { DiagnosticsSession } from './session';
import { badTransport } from './transport';

export function bindObserveData(session: DiagnosticsSession): void {
  session.observeData = (next: string | null) => {
    if (!next || next === session.previousData) return;
    const previous = session.previousData;
    session.previousData = next;
    if (previous === null && !badTransport(next)) return;
    session.push('data_channel_changed', {
      dataChannelState: next,
      previousDataChannelState: previous,
      message: 'Data channel state changed',
    });
  };
}
