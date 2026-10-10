import type { DiagnosticsSession } from './session';

export function createSignalHandler(session: DiagnosticsSession): () => void {
  return () => {
    const nowMs = Date.now();
    if (nowMs - session.signalAt < 20_000) return;
    session.signalAt = nowMs;
    session.push('signal_reconnecting', { message: 'Signal connection is reconnecting' });
    session.requestFlush();
  };
}
