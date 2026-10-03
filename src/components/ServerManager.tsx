'use client';

import {
  Activity,
  CheckCircle2,
  CircleAlert,
  Cpu,
  Database,
  HardDrive,
  Loader2,
  MemoryStick,
  RefreshCw,
  RotateCcw,
  Server,
  Terminal,
  Users,
  Video,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { Locale } from '@/i18n/config';
import { AuditControls, FileControls, HostControls } from '@/components/server-manager/VpsControls';
import { CONFIRM, isAllowedContainerName } from '@/lib/admin/vps-policy';

type ServiceId = 'livekit' | 'caddy' | 'redis';

type ServiceInfo = {
  service: ServiceId;
  container: string;
  status: string;
  running: boolean;
  started_at?: string | null;
};

type Metrics = {
  cpu: {
    percent: number;
    cores: number;
    load_1m: number;
    load_5m: number;
    load_15m: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    percent: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
    percent: number;
  };
  uptime: {
    seconds: number;
  };
  network?: {
    bytes_sent: number;
    bytes_received: number;
    packets_sent: number;
    packets_received: number;
  };
};

type Room = {
  name: string;
  sid: string;
  num_participants: number;
  num_publishers: number;
  creation_time: number;
};

type RoomsData = {
  configured: boolean;
  rooms: Room[];
  room_count: number;
  participant_count: number;
  error?: string;
};

type StatusData = {
  status: string;
  docker: Record<string, string>;
  services: Record<ServiceId, ServiceInfo>;
};

type LogsData = {
  service: ServiceId;
  lines: number;
  logs: string;
};

const SERVICES: Array<{
  id: ServiceId;
  name: string;
  description: string;
  icon: typeof Video;
}> = [
  {
    id: 'livekit',
    name: 'LiveKit',
    description: 'Video rooms and real-time communication',
    icon: Video,
  },
  {
    id: 'caddy',
    name: 'Caddy',
    description: 'TLS, HTTPS and reverse proxy',
    icon: Server,
  },
  {
    id: 'redis',
    name: 'Redis',
    description: 'LiveKit state and coordination',
    icon: Database,
  },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024 ** 3) {
    return `${Math.round(bytes / 1024 ** 2)} MB`;
  }

  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-box border border-hairline bg-main p-4 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-box bg-brass-tint text-brass-strong">
          <Icon className="h-4 w-4" />
        </div>

        <span className="text-xs text-muted">{label}</span>
      </div>

      <div className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        {value}
      </div>

      <div className="mt-1 text-xs text-body">{detail}</div>
    </div>
  );
}

export function ServerManager({
  locale,
  canManageHost = false,
}: {
  locale: Locale;
  canManageHost?: boolean;
}) {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [rooms, setRooms] = useState<RoomsData | null>(null);
  const [logs, setLogs] = useState<LogsData | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restarting, setRestarting] = useState<ServiceId | null>(null);
  const [containerAction, setContainerAction] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  const [selectedLogService, setSelectedLogService] =
    useState<ServiceId>('livekit');

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) {
        setRefreshing(true);
      }

      try {
        setError(null);

        const response = await fetch(
          `/api/admin/server/overview?locale=${encodeURIComponent(locale)}`,
          {
            cache: 'no-store',
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data?.error === 'string'
              ? data.error
              : 'Failed to load server status',
          );
        }

        setStatus(data);
        setMetrics(data.metrics);
        setRooms(data.rooms);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load server status',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [locale],
  );

  const loadLogs = useCallback(
    async (service: ServiceId) => {
      setLogsLoading(true);

      try {
        const response = await fetch(
          `/api/admin/server/logs?locale=${encodeURIComponent(
            locale,
          )}&service=${service}`,
          {
            cache: 'no-store',
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data?.error === 'string'
              ? data.error
              : 'Failed to load logs',
          );
        }

        setLogs(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load logs',
        );
      } finally {
        setLogsLoading(false);
      }
    },
    [locale],
  );

  useEffect(() => {
    void loadData();

    const interval = window.setInterval(() => {
      void loadData(true);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    void loadLogs(selectedLogService);
  }, [loadLogs, selectedLogService]);

  async function containerControl(service: ServiceId, action: 'start' | 'stop') {
    const item = SERVICES.find((entry) => entry.id === service);
    const container = status?.services[service]?.container;
    if (!item || !container || !isAllowedContainerName(container)) return;
    if (!window.confirm(`${action === 'start' ? 'Start' : 'Stop'} ${item.name}?`)) return;

    try {
      setContainerAction(`${service}:${action}`);
      setError(null);
      setMessage(null);
      const response = await fetch(
        `/api/admin/server/docker/action?locale=${encodeURIComponent(locale)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            container,
            action,
            confirm: action === 'start' ? CONFIRM.START : CONFIRM.STOP,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : `Failed to ${action} ${item.name}`);
      }
      setMessage(`${item.name} ${action} completed.`);
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} service`);
    } finally {
      setContainerAction(null);
    }
  }

  async function restartService(service: ServiceId) {
    const item = SERVICES.find((entry) => entry.id === service);

    if (!item) {
      return;
    }

    const confirmed = window.confirm(
      `Restart ${item.name}? This may temporarily interrupt service.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setRestarting(service);
      setError(null);
      setMessage(null);

      const response = await fetch(
        `/api/admin/server/restart?locale=${encodeURIComponent(locale)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            service,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : `Failed to restart ${item.name}`,
        );
      }

      setMessage(`${item.name} restarted successfully.`);

      await new Promise((resolve) => {
        window.setTimeout(resolve, 1500);
      });

      await loadData(true);
      await loadLogs(selectedLogService);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to restart service',
      );
    } finally {
      setRestarting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-60 items-center justify-center rounded-box border border-hairline bg-main shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading server...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(message || error) && (
        <div
          className={[
            'flex items-center gap-2 rounded-box border px-4 py-3 text-sm',
            error
              ? 'border-rose-500/30 bg-rose-500/15 text-rose-500'
              : 'border-win/30 bg-win-tint text-win',
          ].join(' ')}
        >
          {error ? (
            <CircleAlert className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}

          <span>{error ?? message}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Cpu}
          label="CPU"
          value={`${metrics?.cpu.percent.toFixed(1) ?? '0'}%`}
          detail={`${metrics?.cpu.cores ?? 0} logical cores`}
        />

        <MetricCard
          icon={MemoryStick}
          label="Memory"
          value={`${metrics?.memory.percent.toFixed(1) ?? '0'}%`}
          detail={
            metrics
              ? `${formatBytes(metrics.memory.used)} / ${formatBytes(
                  metrics.memory.total,
                )}`
              : '-'
          }
        />

        <MetricCard
          icon={HardDrive}
          label="Disk"
          value={`${metrics?.disk.percent.toFixed(1) ?? '0'}%`}
          detail={
            metrics
              ? `${formatBytes(metrics.disk.used)} / ${formatBytes(
                  metrics.disk.total,
                )}`
              : '-'
          }
        />

        <MetricCard
          icon={Activity}
          label="Uptime"
          value={
            metrics
              ? formatUptime(metrics.uptime.seconds)
              : '-'
          }
          detail={
            metrics
              ? `Load ${metrics.cpu.load_1m.toFixed(2)}`
              : '-'
          }
        />
      </div>

      <div className="relative overflow-hidden rounded-box border border-hairline bg-main p-5 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Services
            </h2>
            <p className="mt-1 text-sm text-body">
              Manage the LiveKit infrastructure.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-box border border-hairline px-3 py-2 text-sm font-medium text-ink transition hover:bg-sectionHeader disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={[
                'h-4 w-4',
                refreshing ? 'animate-spin' : '',
              ].join(' ')}
            />
            Refresh
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            const serviceStatus = status?.services[service.id];
            const isRestarting = restarting === service.id;

            return (
              <div
                key={service.id}
                className="rounded-box border border-hairline p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-box bg-brass-tint text-brass-strong">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="font-medium text-ink">
                        {service.name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {service.description}
                      </div>
                    </div>
                  </div>

                  <span
                    className={[
                      'rounded-box px-2 py-1 text-[11px] font-medium',
                      serviceStatus?.running
                        ? 'bg-win-tint text-win'
                        : 'bg-rose-500/15 text-rose-500',
                    ].join(' ')}
                  >
                    {serviceStatus?.running
                      ? 'Running'
                      : 'Offline'}
                  </span>
                </div>

                <div className="mt-4 rounded-box bg-sectionHeader px-3 py-2">
                  <div className="truncate font-mono text-[11px] text-muted">
                    {serviceStatus?.container ??
                      service.id}
                  </div>

                  <div className="mt-1 text-xs text-body">
                    {serviceStatus?.status ?? 'Unknown'}
                  </div>
                </div>

                {canManageHost ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void containerControl(service.id, 'start')}
                      disabled={restarting !== null || containerAction !== null}
                      className="rounded-box border border-hairline px-3 py-2 text-sm font-medium text-ink transition hover:bg-sectionHeader disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {containerAction === `${service.id}:start` ? 'Starting...' : 'Start'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void containerControl(service.id, 'stop')}
                      disabled={restarting !== null || containerAction !== null}
                      className="rounded-box border border-hairline px-3 py-2 text-sm font-medium text-ink transition hover:bg-sectionHeader disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {containerAction === `${service.id}:stop` ? 'Stopping...' : 'Stop'}
                    </button>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() =>
                    void restartService(service.id)
                  }
                  disabled={restarting !== null || containerAction !== null}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-box border border-hairline px-3 py-2 text-sm font-medium text-ink transition hover:bg-sectionHeader disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRestarting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}

                  {isRestarting ? 'Restarting...' : 'Restart'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-box border border-hairline bg-main p-5 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">
                LiveKit rooms
              </h2>

              <p className="mt-1 text-sm text-body">
                Active rooms and participants.
              </p>
            </div>

            <Video className="h-5 w-5 text-muted" />
          </div>

          {!rooms?.configured ? (
            <div className="mt-5 rounded-box bg-brass-tint p-4 text-sm text-brass-strong">
              LiveKit API credentials are not configured on the
              server agent.
            </div>
          ) : rooms?.error ? (
            <div className="mt-5 rounded-box border border-rose-500/30 bg-rose-500/15 p-4 text-sm text-rose-500">
              {rooms.error}
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-box bg-sectionHeader p-4">
                  <div className="text-xs text-muted">
                    Rooms
                  </div>

                  <div className="mt-1 text-2xl font-semibold text-ink">
                    {rooms.room_count}
                  </div>
                </div>

                <div className="rounded-box bg-sectionHeader p-4">
                  <div className="text-xs text-muted">
                    Participants
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-2xl font-semibold text-ink">
                    <Users className="h-5 w-5 text-muted" />
                    {rooms.participant_count}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {rooms.rooms.length === 0 ? (
                  <div className="rounded-box border border-dashed border-hairline p-5 text-center text-sm text-muted">
                    No active rooms.
                  </div>
                ) : (
                  rooms.rooms.map((room) => (
                    <div
                      key={room.sid}
                      className="rounded-box border border-hairline p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-ink">
                          {room.name}
                        </span>

                        <span className="shrink-0 text-xs text-muted">
                          {room.num_participants}{' '}
                          participant
                          {room.num_participants === 1
                            ? ''
                            : 's'}
                        </span>
                      </div>

                      <div className="mt-1 truncate font-mono text-[10px] text-muted">
                        {room.sid}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="relative overflow-hidden rounded-box border border-hairline bg-main p-5 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">
                System load
              </h2>

              <p className="mt-1 text-sm text-body">
                Current server resource usage.
              </p>
            </div>

            <Activity className="h-5 w-5 text-muted" />
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-body">CPU</span>
                <span className="font-medium text-ink">
                  {metrics?.cpu.percent.toFixed(1)}%
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-box bg-paper-deep">
                <div
                  className="h-full rounded-box bg-[#465D73]"
                  style={{
                    width: `${Math.min(
                      metrics?.cpu.percent ?? 0,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs">
                <span className="text-body">Memory</span>
                <span className="font-medium text-ink">
                  {metrics?.memory.percent.toFixed(1)}%
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-box bg-paper-deep">
                <div
                  className="h-full rounded-box bg-[#465D73]"
                  style={{
                    width: `${Math.min(
                      metrics?.memory.percent ?? 0,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>

            {metrics?.network ? (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-box bg-sectionHeader p-3">
                  <div className="text-muted">Sent</div>
                  <div className="mt-1 font-medium text-ink">{formatBytes(metrics.network.bytes_sent)}</div>
                </div>
                <div className="rounded-box bg-sectionHeader p-3">
                  <div className="text-muted">Received</div>
                  <div className="mt-1 font-medium text-ink">{formatBytes(metrics.network.bytes_received)}</div>
                </div>
              </div>
            ) : null}

            <div>
              <div className="flex justify-between text-xs">
                <span className="text-body">Disk</span>
                <span className="font-medium text-ink">
                  {metrics?.disk.percent.toFixed(1)}%
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-box bg-paper-deep">
                <div
                  className="h-full rounded-box bg-[#465D73]"
                  style={{
                    width: `${Math.min(
                      metrics?.disk.percent ?? 0,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-box border border-hairline bg-main p-5 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <Terminal className="h-4 w-4" />
              Service logs
            </h2>

            <p className="mt-1 text-sm text-body">
              Latest container output.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {SERVICES.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() =>
                  setSelectedLogService(service.id)
                }
                className={[
                  'cursor-pointer rounded-box px-3 py-2 text-xs transition',
                  selectedLogService === service.id
                    ? 'bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                    : 'border border-hairline font-medium text-mainText hover:bg-sectionHeader',
                ].join(' ')}
              >
                {service.name}
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                void loadLogs(selectedLogService)
              }
              disabled={logsLoading}
              className="inline-flex items-center gap-2 rounded-box border border-hairline px-3 py-2 text-xs font-medium text-ink transition hover:bg-sectionHeader disabled:opacity-50"
            >
              <RefreshCw
                className={[
                  'h-3.5 w-3.5',
                  logsLoading ? 'animate-spin' : '',
                ].join(' ')}
              />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-box border border-hairline bg-slate-950">
          <pre className="max-h-[420px] overflow-auto p-4 font-mono text-[11px] leading-5 text-slate-200">
            {logsLoading
              ? 'Loading logs...'
              : logs?.logs || 'No logs available.'}
          </pre>
        </div>
      </div>

      {canManageHost ? (
        <>
          <HostControls locale={locale} />
          <FileControls locale={locale} />
          <AuditControls locale={locale} />
        </>
      ) : null}
    </div>
  );
}