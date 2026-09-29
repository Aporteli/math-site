
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  RefreshCw,
  Server,
} from 'lucide-react';

type DockerServices = Record<string, string>;

type ServerStatus = {
  status: string;
  docker: DockerServices;
};

const SERVICES = [
  {
    id: 'livekitpinfcomge-livekit-1',
    name: 'LiveKit',
    description: 'ვიდეოზარების მთავარი სერვისი',
  },
  {
    id: 'livekitpinfcomge-caddy-1',
    name: 'Caddy',
    description: 'HTTPS და ქსელური proxy',
  },
  {
    id: 'livekitpinfcomge-redis-1',
    name: 'Redis',
    description: 'LiveKit-ის დამხმარე მონაცემთა სერვისი',
  },
] as const;

function isServiceOnline(status: string | undefined) {
  return status?.startsWith('Up') ?? false;
}

export function ServerManager() {
  const [data, setData] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setError(null);

      const response = await fetch('/api/admin/server/status', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to load server status');
      }

      const result: ServerStatus = await response.json();

      setData(result);
    } catch {
      setError('სერვერის მდგომარეობის მიღება ვერ მოხერხდა');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadStatus();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-navy-tint text-navy">
              <Server
                className="size-5"
                aria-hidden="true"
              />
            </span>

            <div>
              <h3 className="text-sm font-semibold text-ink">
                LiveKit ინფრასტრუქტურა
              </h3>

              <p className="mt-0.5 text-xs text-muted">
                VPS-ზე გაშვებული სერვისების მიმდინარე მდგომარეობა
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-hairline px-3 py-2 text-sm font-medium text-body transition-colors hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={[
                'size-4',
                refreshing ? 'animate-spin' : '',
              ].join(' ')}
              aria-hidden="true"
            />

            {refreshing ? 'განახლება...' : 'განახლება'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <CircleAlert
            className="mt-0.5 size-5 shrink-0"
            aria-hidden="true"
          />

          <div>
            <p className="text-sm font-semibold">
              სერვერთან დაკავშირება ვერ მოხერხდა
            </p>

            <p className="mt-1 text-xs text-red-600">
              {error}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {SERVICES.map((service) => {
          const status = data?.docker?.[service.id];
          const online = isServiceOnline(status);

          return (
            <div
              key={service.id}
              className="rounded-2xl border border-hairline bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    {service.name}
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-muted">
                    {service.description}
                  </p>
                </div>

                {loading ? (
                  <Loader2
                    className="size-5 shrink-0 animate-spin text-muted"
                    aria-label="იტვირთება"
                  />
                ) : online ? (
                  <CheckCircle2
                    className="size-5 shrink-0 text-emerald-500"
                    aria-label="Online"
                  />
                ) : (
                  <CircleAlert
                    className="size-5 shrink-0 text-red-500"
                    aria-label="Offline"
                  />
                )}
              </div>

              <div className="mt-5 flex items-center gap-2">
                <span
                  className={[
                    'size-2 rounded-full',
                    loading
                      ? 'bg-muted'
                      : online
                        ? 'bg-emerald-500'
                        : 'bg-red-500',
                  ].join(' ')}
                />

                <span
                  className={[
                    'text-sm font-medium',
                    loading
                      ? 'text-muted'
                      : online
                        ? 'text-emerald-600'
                        : 'text-red-600',
                  ].join(' ')}
                >
                  {loading
                    ? 'იტვირთება'
                    : online
                      ? 'Online'
                      : 'Offline'}
                </span>
              </div>

              {status ? (
                <p className="mt-3 truncate border-t border-hairline pt-3 text-[11px] text-muted">
                  {status}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {data ? (
        <div className="rounded-2xl border border-hairline bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium text-muted">
              Agent status
            </span>

            <span className="text-xs font-semibold text-emerald-600">
              {data.status}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

