import type { DiagnosticsSession } from './session';

export function pushAudioSubscription(
  session: DiagnosticsSession,
  remoteIdentity: string,
  subscriptionState: string,
): void {
  session.push('audio_subscription_changed', { remoteIdentity, subscriptionState });
}
