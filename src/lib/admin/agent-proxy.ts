import { NextResponse } from 'next/server';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function agentRequestUrl(
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

export function safeAgentMessage(data: unknown, fallback: string): string {
  const raw = isRecord(data)
    ? typeof data.error === 'string'
      ? data.error
      : typeof data.detail === 'string'
        ? data.detail
        : ''
    : '';
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned.length > 400) return fallback;
  if (/private key|begin |api[_-]?key\s*[:=]|secret\s*[:=]|token\s*[:=]/i.test(cleaned)) {
    return fallback;
  }
  return cleaned;
}

export async function callAgent(input: {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, string>;
  body?: unknown;
  actor?: string;
  timeoutMs?: number;
}): Promise<{ status: number; data: unknown }> {
  const agentUrl = process.env.ADMIN_AGENT_URL;
  const agentToken = process.env.ADMIN_AGENT_TOKEN;
  if (!agentUrl || !agentToken) {
    return { status: 500, data: { error: 'Admin agent is not configured' } };
  }

  const url = agentRequestUrl(agentUrl, input.path, input.query);
  if (!url) {
    return { status: 500, data: { error: 'Admin agent is not configured' } };
  }

  try {
    const response = await fetch(url, {
      method: input.method ?? 'GET',
      headers: {
        'X-Agent-Token': agentToken,
        ...(input.actor ? { 'X-Admin-Actor': input.actor } : {}),
        ...(input.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: input.body !== undefined ? JSON.stringify(input.body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(input.timeoutMs ?? 30_000),
    });
    const data: unknown = await response.json().catch(() => null);
    if (response.status === 404) {
      return { status: 502, data: { error: 'The admin agent does not support this action yet.' } };
    }
    return { status: response.status, data };
  } catch (error) {
    const timedOut =
      error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return {
      status: timedOut ? 504 : 502,
      data: { error: timedOut ? 'The admin agent timed out' : 'Admin agent is unreachable' },
    };
  }
}

export function agentJson(status: number, data: unknown, fallback: string) {
  if (status >= 200 && status < 300) {
    return NextResponse.json(data ?? { success: true }, { status });
  }
  return NextResponse.json({ error: safeAgentMessage(data, fallback) }, { status });
}
