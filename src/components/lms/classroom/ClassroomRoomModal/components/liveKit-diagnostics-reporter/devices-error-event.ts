import { errorText } from './format';
import type { DiagnosticsSession } from './session';

export function createDevicesErrorHandler(session: DiagnosticsSession): (error: Error, kind?: MediaDeviceKind) => void {
  return (error: Error, kind?: MediaDeviceKind) => {
    session.push('livekit_error', { message: errorText(error), device: kind ?? null });
    session.requestFlush();
  };
}
