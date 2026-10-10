import { effectiveType } from './browser';
import type { DiagnosticsSession } from './session';

export function createNetworkHandler(session: DiagnosticsSession): () => void {
  let lastEffective = effectiveType();
  return () => {
    const next = effectiveType();
    if (!next || next === lastEffective) return;
    const previous = lastEffective;
    lastEffective = next;
    session.push('browser_network_changed', {
      networkType: next,
      previousNetworkType: previous,
      message: 'Browser network type changed',
    });
    session.requestFlush();
  };
}
