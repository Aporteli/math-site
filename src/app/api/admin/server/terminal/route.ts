import { NextResponse } from 'next/server';
import { isLocale } from '@/i18n/config';
import { clampTerminalOutput, parseTerminalCommand } from '@/lib/admin/terminal-command';
import { requireRole } from '@/lib/auth/session';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function agentRequestUrl(
  agentUrl: string,
  pathname: string,
  query?: Record<string, string>,
): string | null {
  try {
    const url = new URL(agentUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const basePath = url.pathname.replace(/\/$/, '');
    url.pathname = `${basePath}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
    url.search = '';
    url.hash = '';
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  } catch {
    return null;
  }
}

function agentErrorMessage(data: unknown, status: number): string {
  if (status === 404) {
    return 'The admin agent has no /exec endpoint, so the command was not run.';
  }

  if (isRecord(data)) {
    if (typeof data.error === 'string' && data.error.length > 0) return data.error;
    if (typeof data.detail === 'string' && data.detail.length > 0) return data.detail;
  }

  return 'Admin agent rejected the command';
}

function readAgentResult(data: unknown): {
  stdout: string;
  stderr: string;
  exitCode: number;
} | null {
  if (!isRecord(data)) return null;

  const stdout =
    typeof data.stdout === 'string'
      ? data.stdout
      : typeof data.output === 'string'
        ? data.output
        : typeof data.logs === 'string'
          ? data.logs
          : null;

  if (stdout === null) return null;

  const stderr = typeof data.stderr === 'string' ? data.stderr : '';
  const exitRaw = data.exit_code ?? data.exitCode ?? 0;
  const exitCode = typeof exitRaw === 'number' && Number.isInteger(exitRaw) ? exitRaw : 0;

  return {
    stdout: clampTerminalOutput(stdout),
    stderr: clampTerminalOutput(stderr),
    exitCode,
  };
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale');

  if (!locale || !isLocale(locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  }

  await requireRole(locale, ['ADMIN']);

  const body: unknown = await request.json().catch(() => null);
  const command = isRecord(body) && typeof body.command === 'string' ? body.command : null;

  if (!command) {
    return NextResponse.json({ error: 'Command is required' }, { status: 400 });
  }

  const parsed = parseTerminalCommand(command);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const agentUrl = process.env.ADMIN_AGENT_URL;
  const agentToken = process.env.ADMIN_AGENT_TOKEN;

  if (!agentUrl || !agentToken) {
    return NextResponse.json({ error: 'Admin agent is not configured' }, { status: 500 });
  }

  const argv = parsed.command.argv;
  const execUrl = agentRequestUrl(agentUrl, '/exec');
  if (!execUrl) {
    return NextResponse.json({ error: 'Admin agent is not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(execUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Token': agentToken,
      },
      body: JSON.stringify({ argv }),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });

    const data: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { error: agentErrorMessage(data, response.status) },
        { status: response.status },
      );
    }

    const result = readAgentResult(data);
    if (!result) {
      return NextResponse.json(
        { error: 'Admin agent returned an unexpected response' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      argv,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (error) {
    return agentFailure(error);
  }
}

function agentFailure(error: unknown) {
  const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');

  return NextResponse.json(
    { error: timedOut ? 'The command timed out' : 'Admin agent is unreachable' },
    { status: timedOut ? 504 : 502 },
  );
}
