import { NextResponse } from 'next/server';
import { agentJson, callAgent, safeAgentMessage } from '@/lib/admin/agent-proxy';
import { recordAdminAudit } from '@/lib/admin/admin-audit';
import { readJson, requireAdminActor } from '@/lib/admin/admin-request';
import { CONFIRM, classifyPath, isWritableFilename } from '@/lib/admin/vps-policy';

export async function POST(request: Request) {
  const admin = await requireAdminActor(request);
  if ('response' in admin) return admin.response;

  const body = await readJson(request);
  const path = typeof body?.path === 'string' ? body.path : '';
  const to = typeof body?.to === 'string' ? body.to : '';
  const confirm = typeof body?.confirm === 'string' ? body.confirm : '';
  const source = classifyPath(path);
  const destination = classifyPath(to);
  if (!source.ok || !destination.ok || !source.path.writable || !destination.path.writable) {
    return NextResponse.json({ error: 'That rename is not allowed.' }, { status: 400 });
  }
  if (!isWritableFilename(destination.path.path.split('/').pop() ?? '')) {
    return NextResponse.json({ error: 'That name is not allowed.' }, { status: 400 });
  }
  if ((source.path.important || destination.path.important) && confirm !== CONFIRM.SAVE) {
    return NextResponse.json({ error: 'Confirmation is required.' }, { status: 400 });
  }

  const result = await callAgent({
    path: '/files/rename',
    method: 'POST',
    body: { path: source.path.path, to: destination.path.path, confirm },
    actor: admin.actor,
  });
  const ok = result.status >= 200 && result.status < 300;
  await recordAdminAudit({
    actorEmail: admin.actor,
    action: 'file.rename',
    target: `${source.path.path} -> ${destination.path.path}`,
    ok,
    detail: ok ? undefined : safeAgentMessage(result.data, 'failed'),
  });
  return agentJson(result.status, result.data, 'The file could not be renamed');
}
