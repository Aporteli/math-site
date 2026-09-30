import { NextResponse } from 'next/server';
import { agentJson, callAgent, safeAgentMessage } from '@/lib/admin/agent-proxy';
import { recordAdminAudit } from '@/lib/admin/admin-audit';
import { readJson, requireAdminActor } from '@/lib/admin/admin-request';
import { confirmationFor, isHostActionAllowed } from '@/lib/admin/vps-policy';

export async function POST(request: Request) {
  const admin = await requireAdminActor(request);
  if ('response' in admin) return admin.response;

  const body = await readJson(request);
  const service = typeof body?.service === 'string' ? body.service : '';
  const action = typeof body?.action === 'string' ? body.action : '';
  const confirm = typeof body?.confirm === 'string' ? body.confirm : '';

  if (!isHostActionAllowed(service, action)) {
    return NextResponse.json({ error: 'That service action is not allowed.' }, { status: 400 });
  }

  if (confirm !== confirmationFor(action)) {
    return NextResponse.json({ error: 'Confirmation is required.' }, { status: 400 });
  }

  const result = await callAgent({
    path: `/host/services/${service}/${action}`,
    method: 'POST',
    body: { confirm },
    actor: admin.actor,
    timeoutMs: 40_000,
  });
  const ok = result.status >= 200 && result.status < 300;
  await recordAdminAudit({
    actorEmail: admin.actor,
    action: `service.${action}`,
    target: service,
    ok,
    detail: ok ? undefined : safeAgentMessage(result.data, 'failed'),
  });
  return agentJson(result.status, result.data, 'The service action failed');
}
