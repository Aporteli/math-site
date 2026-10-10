interface NetworkInformation extends EventTarget {
  effectiveType?: string;
}

export function browserVisibility(): 'visible' | 'hidden' {
  return document.visibilityState === 'visible' ? 'visible' : 'hidden';
}

export function effectiveType(): string | null {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  const value = connection?.effectiveType?.trim().toLowerCase() ?? '';
  if (!/^[a-z0-9-]{1,20}$/.test(value)) return null;
  return value;
}

export function browserConnection(): NetworkInformation | null {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!connection || typeof connection.addEventListener !== 'function') return null;
  return connection;
}
