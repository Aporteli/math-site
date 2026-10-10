import type { DiagnosticEventInput } from '@/lib/livekit/diagnostics/contract';
import type { DiagnosticsSession } from './session';

export function bindRestore(session: DiagnosticsSession): void {
  session.restore = (events: DiagnosticEventInput[]) => {
    session.pending.unshift(...events);
    if (session.pending.length > 25) session.pending.splice(0, session.pending.length - 25);
  };
}
