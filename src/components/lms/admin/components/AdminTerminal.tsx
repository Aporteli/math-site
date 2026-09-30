'use client';

import { CircleAlert, Loader2, Terminal } from 'lucide-react';
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import type { Locale } from '@/i18n/config';

const SHORTCUTS = [
  { label: 'Docker PS', command: 'docker ps' },
  { label: 'LiveKit Logs', command: 'docker logs --tail 100 livekitpinfcomge-livekit-1' },
  { label: 'Caddy Logs', command: 'docker logs --tail 100 livekitpinfcomge-caddy-1' },
  { label: 'Redis Logs', command: 'docker logs --tail 100 livekitpinfcomge-redis-1' },
] as const;

const HISTORY_LIMIT = 20;

type TerminalRun = {
  id: number;
  command: string;
  argv: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRun(value: unknown, id: number, command: string): TerminalRun | null {
  if (!isRecord(value) || !isStringArray(value.argv)) return null;
  if (typeof value.exitCode !== 'number' || !Number.isInteger(value.exitCode)) return null;
  if (typeof value.stdout !== 'string' || typeof value.stderr !== 'string') return null;

  return {
    id,
    command,
    argv: value.argv,
    exitCode: value.exitCode,
    stdout: value.stdout,
    stderr: value.stderr,
  };
}

function readError(value: unknown): string {
  if (isRecord(value) && typeof value.error === 'string' && value.error.length > 0) {
    return value.error;
  }

  return 'The command failed';
}

function formatRun(run: TerminalRun): string {
  const lines = [`$ ${run.command}`, run.stdout.trimEnd()];
  if (run.stderr.trim().length > 0) lines.push(run.stderr.trimEnd());
  lines.push(`exit ${run.exitCode}`);
  return lines.filter((line) => line.length > 0).join('\n');
}

export function AdminTerminal({ locale }: { locale: Locale }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef('');
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [runs, setRuns] = useState<TerminalRun[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextId, setNextId] = useState(1);

  function insertCommand(value: string) {
    setCommand(value);
    setHistoryIndex(null);
    draftRef.current = value;
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(value.length, value.length);
    });
  }

  function rememberCommand(value: string) {
    setHistory((current) => {
      if (current[current.length - 1] === value) return current;
      return [...current, value].slice(-HISTORY_LIMIT);
    });
    setHistoryIndex(null);
    draftRef.current = value;
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    if (history.length === 0) return;

    event.preventDefault();

    if (event.key === 'ArrowUp') {
      const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      if (historyIndex === null) draftRef.current = command;
      const entry = history[nextIndex];
      if (entry === undefined) return;
      setHistoryIndex(nextIndex);
      setCommand(entry);
      return;
    }

    if (historyIndex === null) return;

    const nextIndex = historyIndex + 1;
    if (nextIndex >= history.length) {
      setHistoryIndex(null);
      setCommand(draftRef.current);
      return;
    }

    const entry = history[nextIndex];
    if (entry === undefined) return;
    setHistoryIndex(nextIndex);
    setCommand(entry);
  }

  async function runCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = command.trim();
    if (!trimmed || running) return;

    setRunning(true);
    setError(null);
    rememberCommand(trimmed);

    try {
      const response = await fetch(
        `/api/admin/server/terminal?locale=${encodeURIComponent(locale)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ command: trimmed }),
          cache: 'no-store',
        },
      );

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readError(data));
      }

      const run = readRun(data, nextId, trimmed);
      if (!run) {
        throw new Error('The server returned an unexpected response');
      }

      setNextId((current) => current + 1);
      setRuns((current) => [...current.slice(-(HISTORY_LIMIT - 1)), run]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The command failed');
    } finally {
      setRunning(false);
    }
  }

  function clearOutput() {
    setRuns([]);
    setError(null);
  }

  return (
    <div className="rounded-2xl border border-hairline bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-navy-tint text-navy">
          <Terminal className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-ink">VPS terminal</h3>
          <p className="mt-1 text-sm text-body">
            Commands run on the VPS through the admin agent. Only diagnostic commands are accepted: docker ps, docker logs, ls, cat, grep, pip show, and systemctl status.
          </p>
        </div>
      </div>

      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => void runCommand(event)}>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Command</span>
          <input
            ref={inputRef}
            value={command}
            onChange={(event) => {
              setCommand(event.target.value);
              setHistoryIndex(null);
              draftRef.current = event.target.value;
            }}
            onKeyDown={onInputKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="docker ps"
            className="w-full rounded-xl border border-hairline bg-paper px-3 py-2 font-mono text-sm text-ink outline-none transition focus:border-navy/40"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={running || command.trim().length === 0}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-strong disabled:opacity-50 sm:flex-none"
          >
            {running ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Run
          </button>
          <button
            type="button"
            onClick={clearOutput}
            disabled={running || (runs.length === 0 && error === null)}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-hairline px-4 py-2 text-sm font-semibold text-ink transition hover:bg-paper disabled:opacity-50 sm:flex-none"
          >
            Clear
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {SHORTCUTS.map((shortcut) => (
          <button
            key={shortcut.label}
            type="button"
            className="rounded-xl border border-hairline px-3 py-1.5 text-xs font-medium text-body transition hover:bg-paper hover:text-navy"
            onClick={() => insertCommand(shortcut.command)}
          >
            {shortcut.label}
          </button>
        ))}
      </div>

      {history.length > 0 ? (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">History</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[...history].reverse().map((entry, index) => (
              <button
                key={`${entry}-${history.length - index}`}
                type="button"
                className="max-w-full truncate rounded-xl border border-hairline px-3 py-1.5 font-mono text-[11px] text-body transition hover:bg-paper hover:text-navy"
                onClick={() => insertCommand(entry)}
              >
                {entry}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-hairline bg-slate-950">
        <pre className="max-h-[420px] overflow-auto p-4 font-mono text-[11px] leading-5 text-slate-200">
          {runs.length === 0 ? 'Output will appear here.' : runs.map((run) => formatRun(run)).join('\n\n')}
        </pre>
      </div>
    </div>
  );
}
