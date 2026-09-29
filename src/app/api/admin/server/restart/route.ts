
import { NextResponse } from 'next/server';
import { isLocale } from '@/i18n/config';
import { requireRole } from '@/lib/auth/session';

const SERVICES = {
  livekit: 'livekit',
  caddy: 'caddy',
  redis: 'redis',
} as const;

type Service = keyof typeof SERVICES;

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale');
  
  if (!locale || !isLocale(locale)) {
    return NextResponse.json(
      { error: 'Invalid locale' },
      { status: 400 },
    );
  }

  await requireRole(locale, ['TEACHER', 'ADMIN']);

  const body = await request.json().catch(() => null);
  const service = body?.service as Service | undefined;

  if (!service || !(service in SERVICES)) {
    return NextResponse.json(
      { error: 'Invalid service' },
      { status: 400 },
    );
  }

  const agentUrl = process.env.ADMIN_AGENT_URL;
  const agentToken = process.env.ADMIN_AGENT_TOKEN;

  if (!agentUrl || !agentToken) {
    return NextResponse.json(
      { error: 'Admin agent is not configured' },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `${agentUrl}/services/${SERVICES[service]}/restart`,
      {
        method: 'POST',
        headers: {
          'X-Agent-Token': agentToken,
        },
        cache: 'no-store',
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Admin agent rejected the request',
          details: data,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Admin agent is unreachable' },
      { status: 502 },
    );
  }
}

