import type { DiagnosticsSession } from './session';

export function createReconnectingHandler(session: DiagnosticsSession): () => void {
  return () => {
    session.push('reconnecting', { message: 'Connection entered reconnecting state' });
    session.requestFlush();
  };
}
