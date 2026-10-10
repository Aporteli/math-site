import type { DiagnosticsSession } from './session';

export function createOfflineHandler(session: DiagnosticsSession): () => void {
  return () => {
    session.push('browser_offline', { online: false, message: 'Browser reported the network as offline' });
    session.requestFlush();
  };
}
