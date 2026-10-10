import { DisconnectReason } from 'livekit-client';

export function clip(value: string | undefined, max: number): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function metric(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  return Math.min(value, 120_000);
}

export function count(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  return Math.min(Math.round(value), 50_000_000);
}

export function reasonName(reason: DisconnectReason | undefined): string | null {
  if (reason === undefined) return null;
  const name = DisconnectReason[reason];
  return typeof name === 'string' ? name : null;
}

export function errorText(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim().slice(0, 240);
  return 'LiveKit error';
}
