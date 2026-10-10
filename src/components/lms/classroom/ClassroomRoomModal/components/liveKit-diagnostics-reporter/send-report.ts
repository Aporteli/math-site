import type { DiagnosticsReport } from '@/lib/livekit/diagnostics/contract';
import type { DiagnosticsSession } from './session';

export function bindSend(session: DiagnosticsSession): void {
  session.send = async (report: DiagnosticsReport, beacon: boolean): Promise<boolean> => {
    const json = JSON.stringify(report);
    try {
      if (beacon && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([json], { type: 'application/json' });
        if (navigator.sendBeacon('/api/livekit/diagnostics', blob)) return true;
      }
      const response = await fetch('/api/livekit/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
        keepalive: beacon,
      });
      return response.ok;
    } catch {
      return false;
    }
  };
}
