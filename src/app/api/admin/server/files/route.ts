import { NextResponse } from 'next/server';
import { agentJson, callAgent, safeAgentMessage } from '@/lib/admin/agent-proxy';
import { recordAdminAudit } from '@/lib/admin/admin-audit';
import { readJson, requireAdminActor } from '@/lib/admin/admin-request';
import { CONFIRM, classifyPath, isCreatableFilename } from '@/lib/admin/vps-policy';

const MAX_CONTENT = 200_000;

function contentError(content: string): string | null {
  if (content.length > MAX_CONTENT || content.includes('\0')) {
    return 'That file is too large or is not text.';
  }
  return null;
}

export async function GET(request: Request) {
  const admin = await requireAdminActor(request);
  if ('response' in admin) return admin.response;

  const path = new URL(request.url).searchParams.get('path') ?? '';
  const classified = classifyPath(path);
  if (!classified.ok) {
    return NextResponse.json({ error: classified.error }, { status: 400 });
  }

  const result = await callAgent({
    path: '/files',
    query: { path: classified.path.path },
    actor: admin.actor,
  });
  return agentJson(result.status, result.data, 'Failed to read that path');
}

export async function PUT(request: Request) {
  const admin = await requireAdminActor(request);
  if ('response' in admin) return admin.response;

  const body = await readJson(request);
  const path = typeof body?.path === 'string' ? body.path : '';
  const content = typeof body?.content === 'string' ? body.content : '';
  const confirm = typeof body?.confirm === 'string' ? body.confirm : '';
  const classified = classifyPath(path);
  if (!classified.ok || !classified.path.writable) {
    return NextResponse.json({ error: 'That file cannot be changed.' }, { status: 400 });
  }
  if (classified.path.important && confirm !== CONFIRM.SAVE) {
    return NextResponse.json({ error: 'Confirmation is required.' }, { status: 400 });
  }
  const invalid = contentError(content);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const result = await callAgent({
    path: '/files',
    method: 'PUT',
    body: { path: classified.path.path, content, confirm },
    actor: admin.actor,
    timeoutMs: 70_000,
  });
  const ok = result.status >= 200 && result.status < 300;
  await recordAdminAudit({
    actorEmail: admin.actor,
    action: 'file.write',
    target: classified.path.path,
    ok,
    detail: ok ? undefined : safeAgentMessage(result.data, 'failed'),
  });
  return agentJson(result.status, result.data, 'The file could not be saved');
}

export async function POST(request: Request) {
  const admin = await requireAdminActor(request);
  if ('response' in admin) return admin.response;

  const body = await readJson(request);
  const path = typeof body?.path === 'string' ? body.path : '';
  const content = typeof body?.content === 'string' ? body.content : '';
  const classified = classifyPath(path);
  if (!classified.ok || !classified.path.writable || !isCreatableFilename(classified.path.path.split('/').pop() ?? '')) {
    return NextResponse.json({ error: 'That file cannot be created.' }, { status: 400 });
  }
  const invalid = contentError(content);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const result = await callAgent({
    path: '/files',
    method: 'POST',
    body: { path: classified.path.path, content },
    actor: admin.actor,
    timeoutMs: 30_000,
  });
  const ok = result.status >= 200 && result.status < 300;
  await recordAdminAudit({
    actorEmail: admin.actor,
    action: 'file.create',
    target: classified.path.path,
    ok,
    detail: ok ? undefined : safeAgentMessage(result.data, 'failed'),
  });
  return agentJson(result.status, result.data, 'The file could not be created');
}

export async function DELETE(request: Request) {
  const admin = await requireAdminActor(request);
  if ('response' in admin) return admin.response;

  const body = await readJson(request);
  const path = typeof body?.path === 'string' ? body.path : '';
  const confirm = typeof body?.confirm === 'string' ? body.confirm : '';
  const classified = classifyPath(path);
  if (!classified.ok || !classified.path.writable) {
    return NextResponse.json({ error: 'That file cannot be deleted.' }, { status: 400 });
  }
  if (confirm !== CONFIRM.DELETE) {
    return NextResponse.json({ error: 'Confirmation is required.' }, { status: 400 });
  }

  const result = await callAgent({
    path: '/files',
    method: 'DELETE',
    body: { path: classified.path.path, confirm },
    actor: admin.actor,
  });
  const ok = result.status >= 200 && result.status < 300;
  await recordAdminAudit({
    actorEmail: admin.actor,
    action: 'file.delete',
    target: classified.path.path,
    ok,
    detail: ok ? undefined : safeAgentMessage(result.data, 'failed'),
  });
  return agentJson(result.status, result.data, 'The file could not be deleted');
}
