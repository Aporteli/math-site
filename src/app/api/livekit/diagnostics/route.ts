import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { diagnosticsReportSchema } from '@/lib/livekit/diagnostics/contract';
import {
  getDiagnosticSession,
  ingestDiagnostics,
  listDiagnosticSessions,
  type DiagnosticsAccess,
} from '@/lib/livekit/diagnostics/persist';
import { loadCourseAccess } from '@/lib/livekit/course-access';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function readAccess(): Promise<DiagnosticsAccess | null> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) return null;
  return { userId, role: user.role };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = diagnosticsReportSchema.safeParse(body);
  if (!parsed.success) {
    console.info(
      JSON.stringify({
        scope: 'livekit-diagnostics',
        event: 'invalid_report',
        timestamp: new Date().toISOString(),
        issues: parsed.error.issues.map((issue) => issue.path.join('.')),
      }),
    );
    return NextResponse.json({ error: 'Invalid diagnostics report' }, { status: 400 });
  }

  const loaded = await loadCourseAccess(parsed.data.courseId);
  if (!loaded.ok) return NextResponse.json({ error: loaded.message }, { status: loaded.status });

  try {
    const result = await ingestDiagnostics(loaded.access, parsed.data);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('LiveKit diagnostics ingest failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Could not store diagnostics' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const access = await readAccess();
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const sessionId = new URL(request.url).searchParams.get('sessionId');
  if (sessionId !== null && !/^[a-z0-9]{8,40}$/i.test(sessionId)) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
  }

  try {
    if (sessionId) {
      const detail = await getDiagnosticSession(access, sessionId);
      if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(detail);
    }
    return NextResponse.json(await listDiagnosticSessions(access));
  } catch (error) {
    console.error('LiveKit diagnostics read failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Could not load diagnostics' }, { status: 500 });
  }
}
