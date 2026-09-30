import { NextResponse } from 'next/server';
import { agentJson, callAgent, safeAgentMessage } from '@/lib/admin/agent-proxy';
import { recordAdminAudit } from '@/lib/admin/admin-audit';
import { readJson, requireAdminActor } from '@/lib/admin/admin-request';
import { confirmationFor, isAllowedContainerName } from '@/lib/admin/vps-policy';

const ACTIONS = ['start', 'stop', 'restart'] as const;

export async function POST(request: Request) {
  const admin = await requireAdminActor(request);
  if ('response' in admin) return admin.response;

  const body = await readJson(request);
  const container = typeof body?.container === 'string' ? body.container : '';
  const action = typeof body?.action === 'string' ? body.action : '';
  const confirm = typeof body?.confirm === 'string' ? body.confirm : '';

  if (!isAllowedContainerName(container) || !ACTIONS.includes(action as (typeof ACTIONS)[number])) {
    return NextResponse.json({ error: 'That container action is not allowed.' }, { status: 400 });
  }

  const expected = confirmationFor(action as 'start' | 'stop' | 'restart');
  if (confirm !== expected) {
    return NextResponse.json({ error: 'Confirmation is required.' }, { status: 400 });
  }

  const result = await callAgent({
    path: `/docker/containers/${container}/${action}`,
    method: 'POST',
    body: { confirm },
    actor: admin.actor,
    timeoutMs: 70_000,
  });
  const ok = result.status >= 200 && result.status < 300;
  await recordAdminAudit({
    actorEmail: admin.actor,
    action: `container.${action}`,
    target: container,
    ok,
    detail: ok ? undefined : safeAgentMessage(result.data, 'failed'),
  });
  return agentJson(result.status, result.data, 'The container action failed');
}
