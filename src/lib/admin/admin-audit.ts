import { prisma } from '@/lib/prisma';

export async function recordAdminAudit(input: {
  actorEmail: string;
  action: string;
  target: string;
  ok: boolean;
  detail?: string;
}) {
  const detail = input.detail?.replace(/\s+/g, ' ').trim().slice(0, 500);
  try {
    await prisma.adminAuditEvent.create({
      data: {
        actorEmail: input.actorEmail.slice(0, 200),
        action: input.action.slice(0, 80),
        target: input.target.slice(0, 300),
        ok: input.ok,
        detail: detail || null,
      },
    });
  } catch (error) {
    console.error('ADMIN_AUDIT_WRITE_FAILED', error);
  }
}
