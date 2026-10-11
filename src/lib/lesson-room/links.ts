const MEET_HOST = 'meet.google.com';

export function parseMeetUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== MEET_HOST) return null;

  const parts = url.pathname.split('/').filter(Boolean);
  if (
    parts.length === 1 &&
    parts[0].toLowerCase() !== 'new' &&
    /^[a-z0-9-]{3,64}$/i.test(parts[0])
  ) {
    return `https://${MEET_HOST}/${parts[0]}`;
  }
  if (parts.length === 2 && parts[0] === 'lookup' && /^[a-z0-9_-]{3,128}$/i.test(parts[1])) {
    return `https://${MEET_HOST}/lookup/${parts[1]}`;
  }
  return null;
}

export function parseMiroBoardId(value: string): string | null {
  const trimmed = value.trim();
  const fromUrl = trimmed.match(/miro\.com\/app\/(?:live-embed|board)\/([^/?#]+)/i);
  const raw = decodeURIComponent(fromUrl?.[1] ?? trimmed).replace(/\/$/, '');
  if (!/^[A-Za-z0-9_=-]{8,80}$/.test(raw)) return null;
  return raw;
}

export function miroLiveEmbedUrl(boardId: string): string {
  return `https://miro.com/app/live-embed/${boardId}/?autoplay=true`;
}
