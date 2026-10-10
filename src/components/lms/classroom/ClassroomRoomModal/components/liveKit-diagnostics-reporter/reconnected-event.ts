import type { DiagnosticsSession } from './session';

export function createReconnectedHandler(session: DiagnosticsSession): () => void {
  return () => {
    session.push('reconnected', { message: 'Connection reconnected' });
    session.requestFlush();
  };
}
