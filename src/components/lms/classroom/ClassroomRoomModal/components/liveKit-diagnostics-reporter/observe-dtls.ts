import type { DiagnosticsSession } from './session';
import { badTransport } from './transport';

export function bindObserveDtls(session: DiagnosticsSession): void {
  session.observeDtls = (next: string | null) => {
    if (!next || next === session.previousDtls) return;
    const previous = session.previousDtls;
    session.previousDtls = next;
    if (previous === null && !badTransport(next)) return;
    session.push('dtls_state_changed', { dtls: next, previousDtls: previous, message: 'DTLS state changed' });
  };
}
