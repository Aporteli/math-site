import type { DiagnosticsSession } from './session';
import type { ObservedTransport, TransportSide } from './types';

export function attachTransport(
  session: DiagnosticsSession,
  transport: ObservedTransport,
  side: TransportSide,
): () => void {
  const priorConnection = transport.onConnectionStateChange;
  const priorIce = transport.onIceConnectionStateChange;
  const onConnection = (state: RTCPeerConnectionState) => {
    priorConnection?.call(transport, state);
    session.observePc(side, state);
  };
  const onIce = (state: RTCIceConnectionState) => {
    priorIce?.call(transport, state);
    session.observeIce(side, state);
  };
  transport.onConnectionStateChange = onConnection;
  transport.onIceConnectionStateChange = onIce;
  return () => {
    if (transport.onConnectionStateChange === onConnection) transport.onConnectionStateChange = priorConnection;
    if (transport.onIceConnectionStateChange === onIce) transport.onIceConnectionStateChange = priorIce;
  };
}
