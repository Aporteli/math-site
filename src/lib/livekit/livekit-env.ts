import { RoomServiceClient } from 'livekit-server-sdk';

export interface LiveKitEnv {
  apiKey: string;
  apiSecret: string;
  livekitUrl: string;
  httpUrl: string;
  roomService: RoomServiceClient;
}

export function getLiveKitEnv(): LiveKitEnv | null {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !livekitUrl) return null;

  const httpUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
  return {
    apiKey,
    apiSecret,
    livekitUrl,
    httpUrl,
    roomService: new RoomServiceClient(httpUrl, apiKey, apiSecret),
  };
}
