import 'server-only';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { courseRoomName } from '@/lib/livekit/breakout';
import { CONNECTION_ID_SUFFIX_LENGTH } from '@/lib/livekit/participant-identity';
import type { CourseAccess } from '@/lib/livekit/course-access';
import type { DiagnosticEventDetail, DiagnosticsReport } from '@/lib/livekit/diagnostics/contract';
import {
  healthFor,
  readSamples,
  toListItem,
  toSessionDetail,
  type DiagnosticsListItem,
  type DiagnosticsSessionDetail,
  type EventRecord,
  type ParticipantRecord,
  type SessionRecord,
} from '@/lib/livekit/diagnostics/dto';
import { logLiveKitDiagnostic } from '@/lib/livekit/diagnostics/log';
import {
  NOTABLE_EVENT_KINDS,
  cleanDisplayName,
  isNotableKind,
  sanitizeNetworkType,
  sanitizeRoute,
  worstHealth,
  type DiagnosticSample,
  type ServerRoomSnapshot,
} from '@/lib/livekit/diagnostics/model';
import { getServerSnapshot } from '@/lib/livekit/diagnostics/server-snapshot';

const STALE_MS = 3 * 60 * 1000;
const METRIC_GAP_MS = 4000;
const SAMPLE_GAP_MS = 30_000;
const SAMPLE_CAP = 180;
const SILENT_SERVER_MS = 20_000;
const HISTORY_LIMIT = 40;

const CONNECTION_STATES = new Set([
  'connected',
  'connecting',
  'reconnecting',
  'disconnected',
  'signalReconnecting',
]);
const QUALITIES = new Set(['excellent', 'good', 'poor', 'lost', 'unknown']);
const ICE_STATES = new Set(['new', 'checking', 'connected', 'completed', 'failed', 'disconnected', 'closed']);
const DTLS_STATES = new Set(['new', 'connecting', 'connected', 'closed', 'failed']);

const recentPosts = new Map<string, number>();

export interface DiagnosticsAccess {
  userId: string;
  role: 'ADMIN' | 'TEACHER';
}

export type IngestResult = { ok: true } | { ok: false; status: number; message: string };

function isUnique(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function uniqueTarget(error: Prisma.PrismaClientKnownRequestError): string {
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.join(',');
  return typeof target === 'string' ? target : '';
}

function identityBelongsToUser(identity: string, userId: string): boolean {
  if (identity === userId) return true;
  const prefix = `${userId}:`;
  if (!identity.startsWith(prefix)) return false;
  const suffix = identity.slice(prefix.length);
  return suffix.length === CONNECTION_ID_SUFFIX_LENGTH && /^[0-9a-f-]+$/i.test(suffix);
}

function pickToken(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^[\p{L}\p{N}_. -]{1,80}$/u.test(trimmed)) return null;
  return trimmed;
}

function pickState(value: string): string {
  return CONNECTION_STATES.has(value) ? value : 'unknown';
}

function pickQuality(value: string): string {
  return QUALITIES.has(value) ? value : 'unknown';
}

function pickIce(value: string | null): string | null {
  if (!value) return null;
  return ICE_STATES.has(value) ? value : null;
}

function pickDtls(value: string | null): string | null {
  if (!value) return null;
  return DTLS_STATES.has(value) ? value : null;
}

function eventTime(iso: string, now: Date): Date {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return now;
  const delta = parsed.getTime() - now.getTime();
  if (delta > 60_000 || delta < -5 * 60_000) return now;
  return parsed;
}

function staffRole(userRole: string, isTeacher: boolean): 'teacher' | 'student' | 'admin' {
  if (userRole === 'ADMIN') return 'admin';
  if (isTeacher) return 'teacher';
  return 'student';
}

function bump(sum: number, count: number, value: number | null): { sum: number; count: number; avg: number | null } {
  if (value === null) return { sum, count, avg: count > 0 ? sum / count : null };
  const nextCount = count + 1;
  const nextSum = sum + value;
  return { sum: nextSum, count: nextCount, avg: nextSum / nextCount };
}

function nextMax(current: number | null, value: number | null): number | null {
  if (value === null) return current;
  if (current === null) return value;
  return Math.max(current, value);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeJson(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((item) => normalizeJson(item));
  if (isJsonObject(value)) {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) output[key] = normalizeJson(item);
    }
    return output;
  }
  return null;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return normalizeJson(value) as Prisma.InputJsonValue;
}

function nextSamples(existing: unknown, sample: DiagnosticSample): DiagnosticSample[] {
  const samples = readSamples(existing);
  const last = samples.at(-1);
  if (last) {
    const at = Date.parse(last.t);
    if (Number.isFinite(at) && Date.now() - at < SAMPLE_GAP_MS) return samples;
  }
  const next = [...samples, sample];
  if (next.length > SAMPLE_CAP) next.splice(0, next.length - SAMPLE_CAP);
  return next;
}

function asParticipant(row: {
  id: string;
  identity: string;
  userId: string;
  displayName: string;
  role: string;
  secondary: boolean;
  connectionState: string;
  quality: string;
  reconnects: number;
  disconnects: number;
  reconnectingSince: Date | null;
  rttMs: number | null;
  avgRttMs: number | null;
  maxRttMs: number | null;
  rttSampleCount: number;
  sendLossPct: number | null;
  avgSendLossPct: number | null;
  maxSendLossPct: number | null;
  sendLossSampleCount: number;
  receiveLossPct: number | null;
  avgReceiveLossPct: number | null;
  maxReceiveLossPct: number | null;
  receiveLossSampleCount: number;
  jitterMs: number | null;
  avgJitterMs: number | null;
  maxJitterMs: number | null;
  jitterSampleCount: number;
  audioBitrateKbps: number | null;
  audioTrackState: string | null;
  micPublishing: boolean;
  subscribedAudioCount: number;
  iceState: string | null;
  iceSubscriberState: string | null;
  dtlsState: string | null;
  candidateRoute: string | null;
  reportedNetworkType: string | null;
  reportedRegion: string | null;
  reportedNodeId: string | null;
  serverState: string | null;
  serverRegion: string | null;
  serverAudioPublished: boolean | null;
  serverSeenAt: Date | null;
  lastDisconnectReason: string | null;
  joinedAt: Date;
  leftAt: Date | null;
  lastSeenAt: Date;
  samples?: unknown;
}): ParticipantRecord {
  return { ...row, samples: row.samples ?? [] };
}

function asSession(row: {
  id: string;
  publicId: string;
  courseId: string;
  roomName: string;
  roomKey: string;
  status: string;
  startedAt: Date;
  endedAt: Date | null;
  lastActivityAt: Date;
  teacherName: string | null;
  studentCount: number;
  reconnects: number;
  disconnects: number;
  avgRttMs: number | null;
  maxRttMs: number | null;
  avgPacketLossPct: number | null;
  maxPacketLossPct: number | null;
  serverRegion: string | null;
  serverNodeId: string | null;
  serverVersion: string | null;
  serverSnapshot: unknown;
}): SessionRecord {
  return row;
}

async function recompute(sessionId: string, snapshot: ServerRoomSnapshot | null): Promise<void> {
  const participants = await prisma.liveKitDiagnosticParticipant.findMany({ where: { sessionId } });
  const records = participants.map((row) => asParticipant(row));
  const staff = records.find((row) => row.role === 'teacher' && !row.secondary)
    ?? records.find((row) => row.role === 'teacher' || row.role === 'admin');
  const students = new Set(records.filter((row) => row.role === 'student').map((row) => row.userId));
  const reconnects = records.reduce((total, row) => total + row.reconnects, 0);
  const disconnects = records.reduce((total, row) => total + row.disconnects, 0);
  const avgRttMs = average(records.map((row) => row.avgRttMs).filter((value): value is number => value !== null));
  const maxRttMs = records.reduce<number | null>((max, row) => nextMax(max, row.maxRttMs), null);
  const lossAverages = records.flatMap((row) => [row.avgSendLossPct, row.avgReceiveLossPct]).filter((value): value is number => value !== null);
  const lossPeaks = records.flatMap((row) => [row.maxSendLossPct, row.maxReceiveLossPct]).filter((value): value is number => value !== null);
  const health = worstHealth(records.map((row) => healthFor(row, 'ended', Date.now()).health));
  const region = records.map((row) => row.serverRegion).find((value) => value) ?? null;
  await prisma.liveKitDiagnosticSession.update({
    where: { id: sessionId },
    data: {
      teacherUserId: staff?.userId ?? null,
      teacherName: staff ? cleanDisplayName(staff.displayName) : null,
      studentCount: students.size,
      reconnects,
      disconnects,
      avgRttMs,
      maxRttMs,
      avgPacketLossPct: average(lossAverages),
      maxPacketLossPct: lossPeaks.length > 0 ? Math.max(...lossPeaks) : null,
      health,
      serverRegion: region,
      serverSnapshot: snapshot ? jsonValue(snapshot) : undefined,
    },
  });
}

export async function closeStaleSessions(): Promise<void> {
  const stale = await prisma.liveKitDiagnosticSession.findMany({
    where: { status: 'active', lastActivityAt: { lt: new Date(Date.now() - STALE_MS) } },
    select: { id: true },
  });
  for (const session of stale) {
    await finalizeSession(session.id);
  }
}

export async function finalizeSession(sessionId: string): Promise<void> {
  const session = await prisma.liveKitDiagnosticSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true, roomName: true },
  });
  if (!session || session.status !== 'active') return;
  const snapshot = await getServerSnapshot(session.roomName, false);
  await recompute(sessionId, snapshot);
  await prisma.liveKitDiagnosticSession.update({
    where: { id: sessionId },
    data: {
      status: 'ended',
      endedAt: new Date(),
      activeRoomName: null,
    },
  });
}

async function openSession(courseId: string, roomName: string, roomKey: string): Promise<{ id: string }> {
  const existing = await prisma.liveKitDiagnosticSession.findUnique({
    where: { activeRoomName: roomName },
    select: { id: true },
  });
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.liveKitDiagnosticSession.create({
        data: {
          publicId: randomBytes(2).toString('hex').toUpperCase(),
          courseId,
          roomName,
          roomKey,
          status: 'active',
          activeRoomName: roomName,
        },
        select: { id: true },
      });
    } catch (error) {
      if (!isUnique(error)) throw error;
      const target = uniqueTarget(error);
      if (target.includes('activeRoomName')) {
        const raced = await prisma.liveKitDiagnosticSession.findUnique({
          where: { activeRoomName: roomName },
          select: { id: true },
        });
        if (raced) return raced;
      }
      if (!target.includes('publicId')) throw error;
    }
  }
  throw new Error('Could not open a diagnostics session');
}

function mergeDetail(
  detail: DiagnosticEventDetail | undefined,
  snapshot: ServerRoomSnapshot | null,
  identity: string,
  participants: ParticipantRecord[],
): DiagnosticEventDetail {
  const next: DiagnosticEventDetail = { ...(detail ?? {}) };
  const remoteIdentity = next.remoteIdentity;
  if (remoteIdentity) {
    const known = participants.find((row) => row.identity === remoteIdentity);
    const listed = snapshot?.participants.find((person) => person.identity === remoteIdentity);
    if (known) next.remoteParticipant = cleanDisplayName(known.displayName);
    else if (listed) next.remoteParticipant = cleanDisplayName(listed.name);
    else delete next.remoteIdentity;
  }
  if (snapshot) {
    const listed = snapshot.participants.find((person) => person.identity === identity);
    next.serverSeen = Boolean(listed);
    next.serverState = listed?.state ?? null;
    next.serverRegion = listed?.region ?? null;
    next.serverAudioPublished = listed?.audioPublished ?? null;
  }
  return next;
}

export async function ingestDiagnostics(access: CourseAccess, report: DiagnosticsReport): Promise<IngestResult> {
  if (!identityBelongsToUser(report.self.identity, access.userId)) {
    return { ok: false, status: 403, message: 'Participant identity does not match the signed-in user' };
  }

  const roomName = courseRoomName(report.courseId, report.roomKey);
  const now = new Date();
  const postKey = `${access.userId}:${roomName}`;
  const lastPost = recentPosts.get(postKey) ?? 0;
  if (!report.leaving && report.events.length === 0 && now.getTime() - lastPost < 2000) {
    return { ok: true };
  }
  recentPosts.set(postKey, now.getTime());

  await closeStaleSessions();
  const forceSnapshot = report.leaving || report.events.some((event) => isNotableKind(event.kind));
  const snapshot = await getServerSnapshot(roomName, forceSnapshot);
  const session = await openSession(report.courseId, roomName, report.roomKey);
  const role = staffRole(access.userRole, access.isTeacher);
  const displayName = cleanDisplayName(access.userName);
  const state = pickState(report.self.connectionState);
  const quality = pickQuality(report.self.quality);

  const existingRows = await prisma.liveKitDiagnosticParticipant.findMany({ where: { sessionId: session.id } });
  const participants = existingRows.map((row) => asParticipant(row));
  const existing = existingRows.find((row) => row.identity === report.self.identity) ?? null;
  const acceptMetrics = !existing || now.getTime() - existing.lastSeenAt.getTime() >= METRIC_GAP_MS;

  let reconnects = existing?.reconnects ?? 0;
  let disconnects = existing?.disconnects ?? 0;
  let lastDisconnectReason = existing?.lastDisconnectReason ?? null;
  let reconnectingSince = existing?.reconnectingSince ?? null;

  await prisma.$transaction(async (tx) => {
    for (const event of report.events) {
      const occurredAt = eventTime(event.occurredAt, now);
      const detail = mergeDetail(event.detail, snapshot, report.self.identity, participants);
      const duplicate = await tx.liveKitDiagnosticEvent.findUnique({
        where: { sessionId_dedupeKey: { sessionId: session.id, dedupeKey: event.dedupeKey } },
        select: { id: true },
      });
      if (duplicate) continue;
      await tx.liveKitDiagnosticEvent.create({
        data: {
          sessionId: session.id,
          occurredAt,
          kind: event.kind,
          participant: displayName,
          identity: report.self.identity,
          role,
          dedupeKey: event.dedupeKey,
          detail: jsonValue(detail),
        },
      });
      if (event.kind === 'reconnecting') reconnects += 1;
      if (event.kind === 'disconnected') {
        disconnects += 1;
        if (detail.reason && /^[A-Z0-9_]+$/.test(detail.reason)) lastDisconnectReason = detail.reason;
      }
      if (isNotableKind(event.kind)) {
        logLiveKitDiagnostic({
          event: event.kind,
          room: roomName,
          participant: displayName,
          timestamp: occurredAt.toISOString(),
          rttMs: detail.rttMs ?? null,
          packetLossPct: detail.packetLossPct ?? null,
          jitterMs: detail.jitterMs ?? null,
        });
      }
    }

    const rtt = acceptMetrics ? bump(existing?.rttSumMs ?? 0, existing?.rttSampleCount ?? 0, report.self.rttMs) : null;
    const sendLoss = acceptMetrics
      ? bump(existing?.sendLossSumPct ?? 0, existing?.sendLossSampleCount ?? 0, report.self.sendLossPct)
      : null;
    const receiveLoss = acceptMetrics
      ? bump(existing?.receiveLossSumPct ?? 0, existing?.receiveLossSampleCount ?? 0, report.self.receiveLossPct)
      : null;
    const jitter = acceptMetrics
      ? bump(existing?.jitterSumMs ?? 0, existing?.jitterSampleCount ?? 0, report.self.jitterMs)
      : null;

    if (report.self.reconnecting) {
      if (!reconnectingSince) reconnectingSince = now;
    } else {
      reconnectingSince = null;
    }

    let leftAt = existing?.leftAt ?? null;
    if (report.leaving) leftAt = now;
    else if (state === 'connected' || state === 'reconnecting' || state === 'connecting') leftAt = null;

    const serverSelf = snapshot?.participants.find((person) => person.identity === report.self.identity) ?? null;
    const sample: DiagnosticSample = {
      t: now.toISOString(),
      rttMs: report.self.rttMs,
      sendLossPct: report.self.sendLossPct,
      receiveLossPct: report.self.receiveLossPct,
      jitterMs: report.self.jitterMs,
      bitrateKbps: report.self.audioBitrateKbps,
      quality,
      state,
      ice: pickIce(report.self.iceState),
    };

    const shared = {
      displayName,
      role,
      secondary: report.secondary,
      connectionState: state,
      quality,
      reconnects,
      disconnects,
      reconnectingSince,
      lastDisconnectReason,
      audioTrackState: report.self.audioTrackState,
      micPublishing: report.self.micPublishing,
      subscribedAudioCount: report.self.subscribedAudioCount,
      iceState: pickIce(report.self.iceState),
      iceSubscriberState: pickIce(report.self.iceSubscriberState),
      dtlsState: pickDtls(report.self.dtlsState),
      candidateRoute: sanitizeRoute(report.self.candidateRoute),
      reportedNetworkType: sanitizeNetworkType(report.self.reportedNetworkType),
      reportedRegion: pickToken(report.self.reportedRegion),
      reportedNodeId: pickToken(report.self.reportedNodeId),
      serverState: serverSelf?.state ?? null,
      serverRegion: serverSelf?.region ?? null,
      serverAudioPublished: serverSelf ? serverSelf.audioPublished : null,
      serverSeenAt: snapshot ? now : existing?.serverSeenAt ?? null,
      leftAt,
      lastSeenAt: now,
      ...(acceptMetrics
        ? {
            rttMs: report.self.rttMs,
            rttSumMs: rtt?.sum ?? existing?.rttSumMs ?? 0,
            rttSampleCount: rtt?.count ?? existing?.rttSampleCount ?? 0,
            avgRttMs: rtt?.avg ?? existing?.avgRttMs ?? null,
            maxRttMs: nextMax(existing?.maxRttMs ?? null, report.self.rttMs),
            sendLossPct: report.self.sendLossPct,
            sendLossSumPct: sendLoss?.sum ?? existing?.sendLossSumPct ?? 0,
            sendLossSampleCount: sendLoss?.count ?? existing?.sendLossSampleCount ?? 0,
            avgSendLossPct: sendLoss?.avg ?? existing?.avgSendLossPct ?? null,
            maxSendLossPct: nextMax(existing?.maxSendLossPct ?? null, report.self.sendLossPct),
            receiveLossPct: report.self.receiveLossPct,
            receiveLossSumPct: receiveLoss?.sum ?? existing?.receiveLossSumPct ?? 0,
            receiveLossSampleCount: receiveLoss?.count ?? existing?.receiveLossSampleCount ?? 0,
            avgReceiveLossPct: receiveLoss?.avg ?? existing?.avgReceiveLossPct ?? null,
            maxReceiveLossPct: nextMax(existing?.maxReceiveLossPct ?? null, report.self.receiveLossPct),
            jitterMs: report.self.jitterMs,
            jitterSumMs: jitter?.sum ?? existing?.jitterSumMs ?? 0,
            jitterSampleCount: jitter?.count ?? existing?.jitterSampleCount ?? 0,
            avgJitterMs: jitter?.avg ?? existing?.avgJitterMs ?? null,
            maxJitterMs: nextMax(existing?.maxJitterMs ?? null, report.self.jitterMs),
            audioBitrateKbps: report.self.audioBitrateKbps,
            samples: jsonValue(nextSamples(existing?.samples, sample)),
          }
        : {}),
    };

    if (existing) {
      await tx.liveKitDiagnosticParticipant.update({ where: { id: existing.id }, data: shared });
    } else {
      await tx.liveKitDiagnosticParticipant.create({
        data: {
          sessionId: session.id,
          identity: report.self.identity,
          userId: access.userId,
          ...shared,
          samples: 'samples' in shared ? shared.samples : jsonValue([]),
        },
      });
    }

    const clientUp = state === 'connected' || state === 'reconnecting' || state === 'connecting';
    if (snapshot?.roomExists && clientUp && !serverSelf && !report.leaving) {
      const dedupeKey = `mismatch:${report.self.identity}:${Math.floor(now.getTime() / 30_000)}`;
      const duplicate = await tx.liveKitDiagnosticEvent.findUnique({
        where: { sessionId_dedupeKey: { sessionId: session.id, dedupeKey } },
        select: { id: true },
      });
      if (!duplicate) {
        await tx.liveKitDiagnosticEvent.create({
          data: {
            sessionId: session.id,
            occurredAt: now,
            kind: 'server_mismatch',
            participant: displayName,
            identity: report.self.identity,
            role,
            dedupeKey,
            detail: jsonValue({
              message: 'LiveKit server does not currently list this participant',
              serverSeen: false,
              rttMs: report.self.rttMs,
              packetLossPct: report.self.sendLossPct,
              receiveLossPct: report.self.receiveLossPct,
              jitterMs: report.self.jitterMs,
            }),
          },
        });
        logLiveKitDiagnostic({
          event: 'server_mismatch',
          room: roomName,
          participant: displayName,
          rttMs: report.self.rttMs,
          packetLossPct: report.self.sendLossPct,
          jitterMs: report.self.jitterMs,
        });
      }
    }

    if (snapshot?.roomExists) {
      for (const row of existingRows) {
        if (row.identity === report.self.identity || row.leftAt) continue;
        const silent = now.getTime() - row.lastSeenAt.getTime() > SILENT_SERVER_MS;
        const listed = snapshot.participants.some((person) => person.identity === row.identity);
        if (listed || !silent) continue;
        const dedupeKey = `server-left:${row.identity}:${row.lastSeenAt.getTime()}`;
        const duplicate = await tx.liveKitDiagnosticEvent.findUnique({
          where: { sessionId_dedupeKey: { sessionId: session.id, dedupeKey } },
          select: { id: true },
        });
        if (!duplicate) {
          await tx.liveKitDiagnosticEvent.create({
            data: {
              sessionId: session.id,
              occurredAt: now,
              kind: 'server_mismatch',
              participant: cleanDisplayName(row.displayName),
              identity: row.identity,
              role: row.role,
              dedupeKey,
              detail: jsonValue({
                message: 'LiveKit server no longer lists this participant',
                serverSeen: false,
              }),
            },
          });
        }
        await tx.liveKitDiagnosticParticipant.update({
          where: { id: row.id },
          data: { leftAt: now, connectionState: 'disconnected' },
        });
      }
    }

    if (role === 'teacher' || role === 'admin') {
      await tx.liveKitDiagnosticSession.update({
        where: { id: session.id },
        data: {
          lastActivityAt: now,
          serverNodeId: pickToken(report.self.reportedNodeId) ?? undefined,
          serverVersion: pickToken(report.self.serverVersion) ?? undefined,
        },
      });
    } else {
      await tx.liveKitDiagnosticSession.update({
        where: { id: session.id },
        data: { lastActivityAt: now },
      });
    }
  });

  await recompute(session.id, snapshot);

  if (report.leaving && snapshot) {
    const othersPresent = snapshot.participants.some(
      (person) => person.identity !== report.self.identity && person.state !== 'DISCONNECTED',
    );
    if (!othersPresent) await finalizeSession(session.id);
  }

  return { ok: true };
}

async function notableCounts(sessionIds: string[]): Promise<Map<string, number>> {
  if (sessionIds.length === 0) return new Map();
  const grouped = await prisma.liveKitDiagnosticEvent.groupBy({
    by: ['sessionId'],
    where: { sessionId: { in: sessionIds }, kind: { in: [...NOTABLE_EVENT_KINDS] } },
    _count: { _all: true },
  });
  return new Map(grouped.map((row) => [row.sessionId, row._count._all]));
}

async function courseTitles(courseIds: string[]): Promise<Map<string, string>> {
  if (courseIds.length === 0) return new Map();
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, title: true },
  });
  return new Map(courses.map((course) => [course.id, course.title]));
}

async function teacherCourseIds(userId: string): Promise<string[]> {
  const courses = await prisma.course.findMany({
    where: { teacherId: userId },
    select: { id: true },
  });
  return courses.map((course) => course.id);
}

export async function listDiagnosticSessions(access: DiagnosticsAccess): Promise<{
  active: DiagnosticsListItem[];
  history: DiagnosticsListItem[];
}> {
  await closeStaleSessions();
  const courseFilter = access.role === 'ADMIN' ? {} : { courseId: { in: await teacherCourseIds(access.userId) } };
  const [activeRows, historyRows] = await Promise.all([
    prisma.liveKitDiagnosticSession.findMany({
      where: { ...courseFilter, status: 'active' },
      orderBy: { lastActivityAt: 'desc' },
      include: { participants: { omit: { samples: true } } },
    }),
    prisma.liveKitDiagnosticSession.findMany({
      where: { ...courseFilter, status: 'ended' },
      orderBy: { startedAt: 'desc' },
      take: HISTORY_LIMIT,
      include: { participants: { omit: { samples: true } } },
    }),
  ]);
  const sessions = [...activeRows, ...historyRows];
  const counts = await notableCounts(sessions.map((session) => session.id));
  const titles = await courseTitles([...new Set(sessions.map((session) => session.courseId))]);
  const now = Date.now();
  const toItem = (session: (typeof sessions)[number]) =>
    toListItem(
      asSession(session),
      session.participants.map((row) => asParticipant(row)),
      counts.get(session.id) ?? 0,
      titles.get(session.courseId) ?? null,
      now,
    );
  return {
    active: activeRows.map(toItem),
    history: historyRows.map(toItem),
  };
}

export async function getDiagnosticSession(
  access: DiagnosticsAccess,
  sessionId: string,
): Promise<DiagnosticsSessionDetail | null> {
  await closeStaleSessions();
  const session = await prisma.liveKitDiagnosticSession.findUnique({
    where: { id: sessionId },
    include: {
      participants: { orderBy: { joinedAt: 'asc' } },
      events: { orderBy: { occurredAt: 'desc' }, take: 300 },
    },
  });
  if (!session) return null;
  if (access.role !== 'ADMIN') {
    const allowed = await teacherCourseIds(access.userId);
    if (!allowed.includes(session.courseId)) return null;
  }
  const counts = await notableCounts([session.id]);
  const titles = await courseTitles([session.courseId]);
  const events: EventRecord[] = [...session.events].reverse().map((event) => ({
    id: event.id,
    occurredAt: event.occurredAt,
    kind: event.kind,
    participant: event.participant,
    identity: event.identity,
    role: event.role,
    detail: event.detail,
  }));
  return toSessionDetail(
    asSession(session),
    session.participants.map((row) => asParticipant(row)),
    events,
    counts.get(session.id) ?? 0,
    titles.get(session.courseId) ?? null,
    Date.now(),
  );
}
