'use client';

import { CircleAlert, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { Locale } from '@/i18n/config';
import {
  CONFIRM,
  HOST_SERVICES,
  READ_ROOTS,
  WRITE_ROOT,
  confirmationFor,
  isHostActionAllowed,
  type HostAction,
  type HostLogSource,
  type HostServiceName,
} from '@/lib/admin/vps-policy';

type Notice = { tone: 'ok' | 'error'; text: string };

type HostService = {
  service: string;
  active: string;
  running: boolean;
};

type ProcessRow = {
  pid: number;
  name: string;
  user: string;
  status: string;
  memory: number;
  command: string;
};

type FileEntry = {
  name: string;
  kind: 'dir' | 'file';
  size: number | null;
  writable: boolean;
  important: boolean;
};

type AuditEvent = {
  id: string;
  ts: string;
  actor: string;
  action: string;
  target: string;
  ok: boolean;
  detail: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorText(data: unknown, fallback: string): string {
  if (isRecord(data) && typeof data.error === 'string' && data.error.length > 0) return data.error;
  return fallback;
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 ** 2) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function NoticeBanner({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  return (
    <div
      className={[
        'flex items-center gap-2 rounded-box border px-4 py-3 text-sm',
        notice.tone === 'error'
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700',
      ].join(' ')}
    >
      <CircleAlert className="h-4 w-4 shrink-0" />
      <span>{notice.text}</span>
    </div>
  );
}

const ROOT_LABELS: Record<(typeof READ_ROOTS)[number], string> = {
  '/opt/livekit/livekit.pinf.com.ge': 'LiveKit config',
  '/opt/livekit-admin-agent': 'Agent',
  '/var/log': 'System logs',
};

export function FileControls({ locale }: { locale: Locale }) {
  const [path, setPath] = useState<string>(WRITE_ROOT);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [directoryWritable, setDirectoryWritable] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [original, setOriginal] = useState('');
  const [writable, setWritable] = useState(false);
  const [important, setImportant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [newName, setNewName] = useState('');
  const [renameTo, setRenameTo] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const loadPath = useCallback(
    async (nextPath: string) => {
      setLoading(true);
      setNotice(null);
      try {
        const response = await fetch(
          `/api/admin/server/files?locale=${encodeURIComponent(locale)}&path=${encodeURIComponent(nextPath)}`,
          { cache: 'no-store' },
        );
        const data = await readJson(response);
        if (!response.ok || !isRecord(data)) {
          throw new Error(errorText(data, 'Failed to read that path'));
        }
        if (data.kind === 'dir' && Array.isArray(data.entries)) {
          setPath(typeof data.path === 'string' ? data.path : nextPath);
          setEntries(
            data.entries.flatMap((entry) => {
              if (!isRecord(entry) || typeof entry.name !== 'string') return [];
              return [
                {
                  name: entry.name,
                  kind: entry.kind === 'dir' ? 'dir' : 'file',
                  size: typeof entry.size === 'number' ? entry.size : null,
                  writable: entry.writable === true,
                  important: entry.important === true,
                },
              ];
            }),
          );
          setDirectoryWritable(data.writable === true);
          setFilePath(null);
          setDraft('');
          setOriginal('');
          setWritable(false);
          setImportant(false);
          return;
        }
        if (data.kind === 'file' && typeof data.content === 'string') {
          const file = typeof data.path === 'string' ? data.path : nextPath;
          setFilePath(file);
          setDraft(data.content);
          setOriginal(data.content);
          setWritable(data.writable === true);
          setImportant(data.important === true);
          setRenameTo(file.split('/').pop() ?? '');
          setDeleteConfirm('');
          return;
        }
        throw new Error('The server returned an unexpected response');
      } catch (error) {
        setNotice({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Failed to read that path',
        });
      } finally {
        setLoading(false);
      }
    },
    [locale],
  );

  useEffect(() => {
    void loadPath(WRITE_ROOT);
  }, [loadPath]);

  async function saveFile() {
    if (!filePath) return;
    if (important && !window.confirm(`Save ${filePath}? A backup is created before the write, and the configuration is checked before it is kept.`)) {
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/server/files?locale=${encodeURIComponent(locale)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: filePath,
          content: draft,
          confirm: important ? CONFIRM.SAVE : '',
        }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(errorText(data, 'The file could not be saved'));
      setOriginal(draft);
      setNotice({ tone: 'ok', text: 'File saved. A backup was stored before the change.' });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'The file could not be saved' });
    } finally {
      setSaving(false);
    }
  }

  async function createFile() {
    const name = newName.trim();
    if (!name) return;
    const nextPath = `${path}/${name}`;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/server/files?locale=${encodeURIComponent(locale)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: nextPath, content: '' }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(errorText(data, 'The file could not be created'));
      setNewName('');
      await loadPath(path);
      await loadPath(nextPath);
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'The file could not be created' });
    } finally {
      setSaving(false);
    }
  }

  async function renameFile() {
    if (!filePath) return;
    const name = renameTo.trim();
    const parent = filePath.slice(0, filePath.lastIndexOf('/'));
    const nextPath = `${parent}/${name}`;
    if (nextPath === filePath) return;
    if (important && !window.confirm(`Rename ${filePath}?`)) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/server/files/rename?locale=${encodeURIComponent(locale)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: filePath,
          to: nextPath,
          confirm: important ? CONFIRM.SAVE : '',
        }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(errorText(data, 'The file could not be renamed'));
      setNotice({ tone: 'ok', text: 'File renamed.' });
      await loadPath(parent);
      await loadPath(nextPath);
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'The file could not be renamed' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteFile() {
    if (!filePath || deleteConfirm !== CONFIRM.DELETE) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/server/files?locale=${encodeURIComponent(locale)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, confirm: CONFIRM.DELETE }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(errorText(data, 'The file could not be deleted'));
      const parent = filePath.slice(0, filePath.lastIndexOf('/'));
      setNotice({ tone: 'ok', text: 'File deleted. A backup was kept.' });
      setDeleteConfirm('');
      await loadPath(parent);
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'The file could not be deleted' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-box border border-hairline bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Files</h2>
          <p className="mt-1 text-sm text-body">
            Only approved directories can be opened. Secret files stay hidden.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadPath(filePath ?? path)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-box border border-hairline px-3 py-2 text-sm font-medium text-ink transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={['h-4 w-4', loading ? 'animate-spin' : ''].join(' ')} />
          Refresh
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {READ_ROOTS.map((root) => (
          <button
            key={root}
            type="button"
            onClick={() => void loadPath(root)}
            className={[
              'rounded-box px-3 py-2 text-xs font-medium transition',
              path === root || filePath?.startsWith(`${root}/`)
                ? 'bg-navy text-white'
                : 'border border-hairline text-body hover:bg-slate-50',
            ].join(' ')}
          >
            {ROOT_LABELS[root]}
          </button>
        ))}
      </div>

      <p className="mt-3 truncate font-mono text-[11px] text-muted">{filePath ?? path}</p>
      <div className="mt-3">
        <NoticeBanner notice={notice} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="max-h-80 space-y-1 overflow-auto rounded-box border border-hairline p-2">
          {READ_ROOTS.some((root) => {
            const parent = path.slice(0, path.lastIndexOf('/'));
            return parent === root || parent.startsWith(`${root}/`);
          }) ? (
            <button
              type="button"
              className="block w-full truncate rounded-box px-2 py-1.5 text-left text-xs text-body hover:bg-slate-50"
              onClick={() => void loadPath(path.slice(0, path.lastIndexOf('/')))}
            >
              ..
            </button>
          ) : null}
          {entries.map((entry) => (
            <button
              key={entry.name}
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-box px-2 py-1.5 text-left text-xs hover:bg-slate-50"
              onClick={() => void loadPath(`${path}/${entry.name}`)}
            >
              <span className="truncate text-ink">{entry.kind === 'dir' ? `${entry.name}/` : entry.name}</span>
              <span className="shrink-0 text-muted">{entry.size === null ? '' : formatBytes(entry.size)}</span>
            </button>
          ))}
          {entries.length === 0 && !loading ? <p className="px-2 py-3 text-xs text-muted">This directory is empty.</p> : null}
        </div>

        <div>
          {filePath ? (
            <>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                readOnly={!writable}
                spellCheck={false}
                className="h-72 w-full rounded-box border border-hairline bg-slate-950 p-3 font-mono text-[11px] leading-5 text-slate-200 outline-none"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!writable || saving || draft === original}
                  onClick={() => void saveFile()}
                  className="rounded-box bg-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? 'Saving...' : important ? 'Save config' : 'Save'}
                </button>
                <input
                  value={renameTo}
                  onChange={(event) => setRenameTo(event.target.value)}
                  disabled={!writable || saving}
                  className="w-40 rounded-box border border-hairline px-3 py-2 text-sm text-ink outline-none"
                  aria-label="New file name"
                />
                <button
                  type="button"
                  disabled={!writable || saving || renameTo.trim().length === 0}
                  onClick={() => void renameFile()}
                  className="rounded-box border border-hairline px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
                >
                  Rename
                </button>
              </div>
              {writable ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={deleteConfirm}
                    onChange={(event) => setDeleteConfirm(event.target.value)}
                    placeholder="Type DELETE"
                    className="w-36 rounded-box border border-hairline px-3 py-2 text-sm text-ink outline-none"
                    aria-label="Delete confirmation"
                  />
                  <button
                    type="button"
                    disabled={saving || deleteConfirm !== CONFIRM.DELETE}
                    onClick={() => void deleteFile()}
                    className="rounded-box border border-red-200 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted">This file is read only.</p>
              )}
            </>
          ) : (
            <div className="rounded-box border border-dashed border-hairline p-5 text-sm text-muted">
              Choose a file to read it.
              {directoryWritable ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <input
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="notes.txt"
                    className="w-40 rounded-box border border-hairline bg-white px-3 py-2 text-sm text-ink outline-none"
                    aria-label="New file name"
                  />
                  <button
                    type="button"
                    disabled={saving || newName.trim().length === 0}
                    onClick={() => void createFile()}
                    className="rounded-box border border-hairline bg-white px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
                  >
                    Create file
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const HOST_LABELS: Record<HostServiceName, string> = {
  'livekit-admin-agent': 'Admin agent',
  docker: 'Docker',
};

export function HostControls({ locale }: { locale: Locale }) {
  const [services, setServices] = useState<HostService[]>([]);
  const [processes, setProcesses] = useState<ProcessRow[]>([]);
  const [interfaces, setInterfaces] = useState<Array<{ name: string; bytes_sent: number; bytes_received: number; addresses: string[] }>>([]);
  const [logs, setLogs] = useState('');
  const [logSource, setLogSource] = useState<HostLogSource>('syslog');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [rebootText, setRebootText] = useState('');

  const loadHost = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/server/host?locale=${encodeURIComponent(locale)}`, { cache: 'no-store' });
      const data = await readJson(response);
      if (!response.ok || !isRecord(data)) throw new Error(errorText(data, 'Failed to load host information'));
      setServices(
        Array.isArray(data.services)
          ? data.services.flatMap((item) => {
              if (!isRecord(item) || typeof item.service !== 'string') return [];
              return [{ service: item.service, active: typeof item.active === 'string' ? item.active : 'unknown', running: item.running === true }];
            })
          : [],
      );
      setProcesses(
        Array.isArray(data.processes)
          ? data.processes.flatMap((item) => {
              if (!isRecord(item) || typeof item.pid !== 'number' || typeof item.name !== 'string') return [];
              return [{
                pid: item.pid,
                name: item.name,
                user: typeof item.user === 'string' ? item.user : '',
                status: typeof item.status === 'string' ? item.status : '',
                memory: typeof item.memory === 'number' ? item.memory : 0,
                command: typeof item.command === 'string' ? item.command : '',
              }];
            })
          : [],
      );
      setInterfaces(
        Array.isArray(data.interfaces)
          ? data.interfaces.flatMap((item) => {
              if (!isRecord(item) || typeof item.name !== 'string') return [];
              return [{
                name: item.name,
                bytes_sent: typeof item.bytes_sent === 'number' ? item.bytes_sent : 0,
                bytes_received: typeof item.bytes_received === 'number' ? item.bytes_received : 0,
                addresses: Array.isArray(item.addresses) ? item.addresses.filter((address) => typeof address === 'string') : [],
              }];
            })
          : [],
      );
      setNotice(null);
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Failed to load host information' });
    } finally {
      setLoading(false);
    }
  }, [locale]);

  const loadLogs = useCallback(
    async (source: HostLogSource) => {
      const response = await fetch(
        `/api/admin/server/host/logs?locale=${encodeURIComponent(locale)}&source=${source}`,
        { cache: 'no-store' },
      );
      const data = await readJson(response);
      if (!response.ok || !isRecord(data) || typeof data.logs !== 'string') {
        setLogs(errorText(data, 'Failed to load logs'));
        return;
      }
      setLogs(data.logs);
    },
    [locale],
  );

  useEffect(() => {
    void loadHost();
  }, [loadHost]);

  useEffect(() => {
    void loadLogs(logSource);
  }, [loadLogs, logSource]);

  async function runService(service: HostServiceName, action: HostAction) {
    if (!window.confirm(`${action} ${service}?`)) return;
    setActing(`${service}:${action}`);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/server/host/services?locale=${encodeURIComponent(locale)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, action, confirm: confirmationFor(action) }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(errorText(data, 'The service action failed'));
      setNotice({ tone: 'ok', text: `${service} ${action} completed.` });
      await loadHost();
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'The service action failed' });
    } finally {
      setActing(null);
    }
  }

  async function reboot() {
    if (rebootText !== CONFIRM.REBOOT) return;
    if (!window.confirm('Reboot the VPS now? LiveKit and this admin agent will go offline until it comes back.')) return;
    setActing('reboot');
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/server/reboot?locale=${encodeURIComponent(locale)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: CONFIRM.REBOOT }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(errorText(data, 'The VPS did not reboot'));
      setNotice({ tone: 'ok', text: 'Reboot requested.' });
      setRebootText('');
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'The VPS did not reboot' });
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-4">
      <NoticeBanner notice={notice} />
      <div className="rounded-box border border-hairline bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Host services</h2>
            <p className="mt-1 text-sm text-body">Start, stop, and restart are limited to an allowlist.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadHost()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-box border border-hairline px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
          >
            <RefreshCw className={['h-4 w-4', loading ? 'animate-spin' : ''].join(' ')} />
            Refresh
          </button>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {(Object.keys(HOST_SERVICES) as HostServiceName[]).map((service) => {
            const status = services.find((item) => item.service === service);
            return (
              <div key={service} className="rounded-box border border-hairline p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-ink">{HOST_LABELS[service]}</div>
                    <div className="mt-1 font-mono text-[11px] text-muted">{service}</div>
                  </div>
                  <span className={['rounded-box px-2 py-1 text-[11px] font-medium', status?.running ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-body'].join(' ')}>
                    {status?.active ?? (loading ? '...' : 'unknown')}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {HOST_SERVICES[service].map((action) => (
                    <button
                      key={action}
                      type="button"
                      disabled={acting !== null || !isHostActionAllowed(service, action)}
                      onClick={() => void runService(service, action)}
                      className="inline-flex items-center gap-2 rounded-box border border-hairline px-3 py-2 text-xs font-medium capitalize text-ink disabled:opacity-50"
                    >
                      {acting === `${service}:${action}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-box border border-hairline bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-ink">Network</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {interfaces.map((item) => (
            <div key={item.name} className="rounded-box bg-slate-50 px-3 py-2">
              <div className="text-sm font-medium text-ink">{item.name}</div>
              <div className="mt-1 text-xs text-body">
                {formatBytes(item.bytes_received)} in / {formatBytes(item.bytes_sent)} out
              </div>
              <div className="mt-1 truncate font-mono text-[11px] text-muted">{item.addresses.join(', ') || 'No address'}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-box border border-hairline bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-ink">Processes</h2>
        <div className="mt-4 overflow-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">PID</th>
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">User</th>
                <th className="py-2 pr-3 font-medium">Memory</th>
                <th className="py-2 font-medium">Command</th>
              </tr>
            </thead>
            <tbody>
              {processes.map((process) => (
                <tr key={process.pid} className="border-t border-hairline">
                  <td className="py-2 pr-3 font-mono text-muted">{process.pid}</td>
                  <td className="py-2 pr-3 text-ink">{process.name}</td>
                  <td className="py-2 pr-3 text-body">{process.user}</td>
                  <td className="py-2 pr-3 text-body">{formatBytes(process.memory)}</td>
                  <td className="max-w-[360px] truncate py-2 font-mono text-[11px] text-muted">{process.command}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-box border border-hairline bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">VPS logs</h2>
          <div className="flex gap-2">
            {(['syslog', 'kern', 'agent'] as const).map((source) => (
              <button
                key={source}
                type="button"
                onClick={() => setLogSource(source)}
                className={['rounded-box px-3 py-2 text-xs font-medium', logSource === source ? 'bg-navy text-white' : 'border border-hairline text-body'].join(' ')}
              >
                {source}
              </button>
            ))}
          </div>
        </div>
        <pre className="mt-4 max-h-[320px] overflow-auto rounded-box bg-slate-950 p-4 font-mono text-[11px] leading-5 text-slate-200">
          {logs || 'No logs available.'}
        </pre>
      </div>

      <div className="rounded-box border border-red-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-ink">Reboot VPS</h2>
        <p className="mt-1 text-sm text-body">This stops every service until the machine starts again. Type REBOOT to enable the button.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={rebootText}
            onChange={(event) => setRebootText(event.target.value)}
            placeholder="REBOOT"
            className="w-36 rounded-box border border-hairline px-3 py-2 text-sm text-ink outline-none"
            aria-label="Reboot confirmation"
          />
          <button
            type="button"
            disabled={acting !== null || rebootText !== CONFIRM.REBOOT}
            onClick={() => void reboot()}
            className="rounded-box border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
          >
            {acting === 'reboot' ? 'Rebooting...' : 'Reboot'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AuditControls({ locale }: { locale: Locale }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/server/audit?locale=${encodeURIComponent(locale)}`, { cache: 'no-store' });
      const data = await readJson(response);
      if (!response.ok || !isRecord(data) || !Array.isArray(data.events)) {
        throw new Error(errorText(data, 'Audit log is unavailable'));
      }
      setEvents(
        data.events.flatMap((item) => {
          if (!isRecord(item) || typeof item.id !== 'string' || typeof item.action !== 'string') return [];
          return [{
            id: item.id,
            ts: typeof item.ts === 'string' ? item.ts : '',
            actor: typeof item.actor === 'string' ? item.actor : '',
            action: item.action,
            target: typeof item.target === 'string' ? item.target : '',
            ok: item.ok === true,
            detail: typeof item.detail === 'string' ? item.detail : '',
          }];
        }),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit log is unavailable');
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="rounded-box border border-hairline bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Audit log</h2>
          <p className="mt-1 text-sm text-body">Administrative actions from this panel.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-box border border-hairline px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
        >
          <RefreshCw className={['h-4 w-4', loading ? 'animate-spin' : ''].join(' ')} />
          Refresh
        </button>
      </div>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      <div className="mt-4 space-y-2">
        {events.length === 0 && !loading ? <p className="text-sm text-muted">No administrative actions yet.</p> : null}
        {events.map((event) => (
          <div key={event.id} className="rounded-box border border-hairline px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink">{event.action}</span>
              <span className={['text-[11px] font-medium', event.ok ? 'text-emerald-700' : 'text-red-700'].join(' ')}>
                {event.ok ? 'ok' : 'failed'}
              </span>
            </div>
            <div className="mt-1 truncate font-mono text-[11px] text-muted">{event.target}</div>
            <div className="mt-1 text-[11px] text-body">
              {event.actor} · {event.ts ? new Date(event.ts).toLocaleString() : ''}
              {event.detail ? ` · ${event.detail}` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
