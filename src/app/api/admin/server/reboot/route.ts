import { NextResponse } from 'next/server';
import { agentJson, callAgent, safeAgentMessage } from '@/lib/admin/agent-proxy';
import { recordAdminAudit } from '@/lib/admin/admin-audit';
import { readJson, requireAdminActor } from '@/lib/admin/admin-request';
import { CONFIRM } from '@/lib/admin/vps-policy';

export async function POST(request: Request) {
  const admin = await requireAdminActor(request);
  if ('response' in admin) return admin.response;

  const body = await readJson(request);
  const confirm = typeof body?.confirm === 'string' ? body.confirm : '';
  if (confirm !== CONFIRM.REBOOT) {
    return NextResponse.json({ error: 'Type REBOOT to confirm.' }, { status: 400 });
  }

  const result = await callAgent({
    path: '/system/reboot',
    method: 'POST',
    body: { confirm },
    actor: admin.actor,
    timeoutMs: 20_000,
  });
  const ok = result.status >= 200 && result.status < 300;
  await recordAdminAudit({
    actorEmail: admin.actor,
    action: 'system.reboot',
    target: 'vps',
    ok,
    detail: ok ? undefined : safeAgentMessage(result.data, 'failed'),
  });
  return agentJson(result.status, result.data, 'The VPS did not reboot');
}
