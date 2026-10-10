export type TransportSide = 'publisher' | 'subscriber';

export interface ObservedTransport {
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
  getConnectionState: () => RTCPeerConnectionState;
  getICEConnectionState: () => RTCIceConnectionState;
}

export interface BoardLink {
  state: string | null;
  ice: string | null;
  pc: string | null;
  dataChannelState: string | null;
  dataMessagesSent: number | null;
  dataMessagesReceived: number | null;
}
