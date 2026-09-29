import { NextResponse } from 'next/server';
import { isLocale } from '@/i18n/config';
import { requireRole } from '@/lib/auth/session';

const SERVICES = ['livekit', 'caddy', 'redis'] as const;

type Service = (typeof SERVICES)[number];

function isService(value: string | null): value is Service {
  return value !== null && SERVICES.includes(value as Service);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const locale = searchParams.get('locale');
  const service = searchParams.get('service');

  if (!locale || !isLocale(locale)) {
    return NextResponse.json(
      { error: 'Invalid locale' },
      { status: 400 },
    );
  }

  if (!isService(service)) {
    return NextResponse.json(
      { error: 'Invalid service' },
      { status: 400 },
    );
  }

  await requireRole(locale, ['TEACHER', 'ADMIN']);

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
      `${agentUrl}/logs/${service}?lines=150`,
      {
        headers: {
          'X-Agent-Token': agentToken,
        },
        cache: 'no-store',
      },
    );

    const data = await response.json().catch(() => null);

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { error: 'Admin agent is unreachable' },
      { status: 502 },
    );
  }
}