export const READ_ROOTS = [
  '/opt/livekit/livekit.pinf.com.ge',
  '/opt/livekit-admin-agent',
  '/var/log',
] as const;

export const WRITE_ROOT = '/opt/livekit/livekit.pinf.com.ge';

export const CONTAINERS = [
  'livekitpinfcomge-livekit-1',
  'livekitpinfcomge-caddy-1',
  'livekitpinfcomge-redis-1',
] as const;

export type ContainerName = (typeof CONTAINERS)[number];

export const HOST_SERVICES = {
  'livekit-admin-agent': ['start', 'stop', 'restart'],
  docker: ['restart'],
} as const;

export type HostServiceName = keyof typeof HOST_SERVICES;
export type HostAction = 'start' | 'stop' | 'restart';

export const HOST_LOGS = ['syslog', 'kern', 'agent'] as const;
export type HostLogSource = (typeof HOST_LOGS)[number];

export const CONFIRM = {
  START: 'START',
  STOP: 'STOP',
  RESTART: 'RESTART',
  DELETE: 'DELETE',
  REBOOT: 'REBOOT',
  SAVE: 'SAVE',
} as const;

const DENIED_PARTS = new Set([
  '.ssh',
  '.aws',
  '.env',
  '.venv',
  '.git',
  'caddy_data',
  'private',
  'journal',
  '__pycache__',
  'backups',
]);

const SECRET_BASENAMES = new Set([
  '.env',
  'shadow',
  'id_rsa',
  'id_ed25519',
  'id_ecdsa',
  'credentials.json',
  'environ',
  'auth.log',
  'btmp',
  'wtmp',
  'lastlog',
  'livekit.yaml',
  'init_script.sh',
  'audit.log',
]);

const WRITABLE_EXTENSIONS = new Set([
  '.yaml',
  '.yml',
  '.conf',
  '.txt',
  '.md',
  '.json',
]);

const IMPORTANT_FILES = new Set([
  'docker-compose.yaml',
  'caddy.yaml',
  'redis.conf',
]);

export type ClassifiedPath = {
  path: string;
  writable: boolean;
  important: boolean;
};

export function isAllowedContainerName(value: string): value is ContainerName {
  return (CONTAINERS as readonly string[]).includes(value);
}

export function isHostService(value: string): value is HostServiceName {
  return Object.prototype.hasOwnProperty.call(HOST_SERVICES, value);
}

export function isHostActionAllowed(service: string, action: string): action is HostAction {
  if (!isHostService(service)) return false;
  return (HOST_SERVICES[service] as readonly string[]).includes(action);
}

export function isHostLogSource(value: string): value is HostLogSource {
  return (HOST_LOGS as readonly string[]).includes(value);
}

export function confirmationFor(action: HostAction | 'delete' | 'reboot' | 'save'): string {
  if (action === 'delete') return CONFIRM.DELETE;
  if (action === 'reboot') return CONFIRM.REBOOT;
  if (action === 'save') return CONFIRM.SAVE;
  if (action === 'start') return CONFIRM.START;
  if (action === 'stop') return CONFIRM.STOP;
  return CONFIRM.RESTART;
}

export function isWriteDirectory(input: string): boolean {
  const classified = classifyPath(input);
  if (!classified.ok) return false;
  return classified.path.path === WRITE_ROOT || isUnderRoot(classified.path.path, WRITE_ROOT);
}

export function normalizeAbsolute(input: string): string | null {
  if (input.length === 0 || input.length > 240) return null;
  if (input.includes('\0') || input.includes('\\')) return null;
  if (!input.startsWith('/')) return null;
  if (!/^[/A-Za-z0-9_@.+-]+$/.test(input)) return null;

  const parts: string[] = [];
  for (const part of input.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') return null;
    parts.push(part);
  }

  return `/${parts.join('/')}`;
}

function basename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? '';
}

export function isSecretBasename(name: string): boolean {
  const base = name.toLowerCase();
  if (base.startsWith('.env')) return true;
  if (SECRET_BASENAMES.has(base)) return true;
  return /\.(pem|key|p12|pfx)$/.test(base);
}

function hasDeniedPart(path: string): boolean {
  return path.split('/').some((part) => DENIED_PARTS.has(part.toLowerCase()));
}

function isUnderRoot(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}/`);
}

export function isTerminalPath(input: string): boolean {
  if (input.length === 0 || input.length > 200) return false;
  if (!/^[A-Za-z0-9_./@+-]+$/.test(input)) return false;
  if (input.split('/').includes('..')) return false;

  const base = basename(input).toLowerCase();
  if (isSecretBasename(base)) return false;
  if (input.split('/').some((part) => DENIED_PARTS.has(part.toLowerCase()))) return false;

  if (!input.startsWith('/')) return true;

  const normalized = normalizeAbsolute(input);
  if (!normalized) return false;
  return READ_ROOTS.some((root) => isUnderRoot(normalized, root));
}

export function classifyPath(input: string): { ok: true; path: ClassifiedPath } | { ok: false; error: string } {
  const path = normalizeAbsolute(input);
  if (!path) return { ok: false, error: 'That path is not allowed.' };
  if (hasDeniedPart(path) || isSecretBasename(basename(path))) {
    return { ok: false, error: 'That path is not allowed.' };
  }
  if (!READ_ROOTS.some((root) => isUnderRoot(path, root))) {
    return { ok: false, error: 'That path is outside the allowed directories.' };
  }

  const writable = isUnderRoot(path, WRITE_ROOT) && path !== WRITE_ROOT;
  return {
    ok: true,
    path: {
      path,
      writable,
      important: IMPORTANT_FILES.has(basename(path)),
    },
  };
}

export function isCreatableFilename(name: string): boolean {
  return isWritableFilename(name) && !IMPORTANT_FILES.has(name);
}

export function isWritableFilename(name: string): boolean {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(name)) return false;
  if (isSecretBasename(name)) return false;
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return false;
  return WRITABLE_EXTENSIONS.has(name.slice(dot).toLowerCase());
}

export function joinWritable(directory: string, name: string): string | null {
  const classified = classifyPath(directory);
  if (!classified.ok) return null;
  if (classified.path.path !== WRITE_ROOT && !classified.path.writable) return null;
  if (classified.path.path !== WRITE_ROOT && !isUnderRoot(classified.path.path, WRITE_ROOT)) return null;
  if (!isWritableFilename(name)) return null;
  return `${classified.path.path === '/' ? '' : classified.path.path}/${name}`;
}
