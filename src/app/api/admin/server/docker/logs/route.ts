import { NextResponse } from 'next/server';
import { agentJson, callAgent } from '@/lib/admin/agent-proxy';
import { requireAdminActor } from '@/lib/admin/admin-request';
import { isAllowedContainerName } from '@/lib/admin/vps-policy';

export async function GET(request: Request) {
  const admin = await requireAdminActor(request);
  if ('response' in admin) return admin.response;

  const container = new URL(request.url).searchParams.get('container') ?? '';
  const lines = Number(new URL(request.url).searchParams.get('lines') ?? '150');
  if (!isAllowedContainerName(container) || !Number.isInteger(lines) || lines < 10 || lines > 500) {
    return NextResponse.json({ error: 'That container is not allowed.' }, { status: 400 });
  }

  const result = await callAgent({
    path: `/docker/containers/${container}/logs`,
    query: { lines: String(lines) },
    actor: admin.actor,
  });
  return agentJson(result.status, result.data, 'Failed to load container logs');
}
