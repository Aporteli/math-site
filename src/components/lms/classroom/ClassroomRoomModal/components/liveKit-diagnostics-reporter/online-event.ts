import type { DiagnosticsSession } from './session';

export function createOnlineHandler(session: DiagnosticsSession): () => void {
  return () => {
    session.push('browser_online', { online: true, message: 'Browser reported the network as online' });
    session.requestFlush();
  };
}
