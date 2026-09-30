import { NextResponse } from 'next/server';
import { agentJson, callAgent } from '@/lib/admin/agent-proxy';
import { requireAdminActor } from '@/lib/admin/admin-request';
import { isHostLogSource } from '@/lib/admin/vps-policy';

export async function GET(request: Request) {
  const admin = await requireAdminActor(request);
  if ('response' in admin) return admin.response;

  const source = new URL(request.url).searchParams.get('source') ?? '';
  if (!isHostLogSource(source)) {
    return NextResponse.json({ error: 'That log source is not allowed.' }, { status: 400 });
  }

  const result = await callAgent({
    path: '/host/logs',
    query: { source, lines: '150' },
    actor: admin.actor,
  });
  return agentJson(result.status, result.data, 'Failed to load logs');
}
