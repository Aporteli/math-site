import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminActor } from '@/lib/admin/admin-request';

export async function GET(request: Request) {
  const admin = await requireAdminActor(request);
  if ('response' in admin) return admin.response;

  try {
    const events = await prisma.adminAuditEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 80,
    });
    return NextResponse.json({
      events: events.map((event) => ({
        id: event.id,
        ts: event.createdAt.toISOString(),
        actor: event.actorEmail,
        action: event.action,
        target: event.target,
        ok: event.ok,
        detail: event.detail ?? '',
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Audit log is unavailable' }, { status: 500 });
  }
}
