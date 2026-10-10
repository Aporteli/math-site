import type { DiagnosticsSession } from './session';

export function bindRequestFlush(session: DiagnosticsSession): void {
  session.requestFlush = () => {
    if (session.inFlush || session.leaveRequested || session.stopped) return;
    window.clearTimeout(session.flushSoon);
    session.flushSoon = window.setTimeout(() => void session.flush(false), 1000);
  };
}
