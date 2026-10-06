import { z } from 'zod';

export const WHITEBOARD_MESSAGE_SLOTS = ['send', 'receive', 'ack', 'gap', 'paint'] as const;
export const WHITEBOARD_MESSAGE_STATUSES = [
  'sent',
  'skipped',
  'send_error',
  'receiving',
  'assembled',
  'parsed',
  'applied',
  'ignored',
  'ack_sent',
  'ack_received',
  'receive_error',
  'gap',
  'slow_paint',
] as const;

const epoch = z.number().int().min(0).max(10_000_000_000_000);
const duration = z.number().int().min(0).max(600_000);
const offsets = z.array(duration).max(12);

export const whiteboardMessageSchema = z.object({
  messageId: z.string().trim().min(4).max(40),
  slot: z.enum(WHITEBOARD_MESSAGE_SLOTS),
  type: z.string().trim().min(1).max(40),
  status: z.enum(WHITEBOARD_MESSAGE_STATUSES),
  updatedAt: epoch,
  sequence: z.number().int().min(0).max(50_000_000).optional(),
  peerIdentity: z.string().trim().min(1).max(120).optional(),
  destinations: z.string().trim().min(1).max(240).optional(),
  payloadBytes: z.number().int().min(0).max(50_000_000).optional(),
  chunkCount: z.number().int().min(0).max(10_000).optional(),
  chunksPublished: z.number().int().min(0).max(10_000).optional(),
  chunksReceived: z.number().int().min(0).max(10_000).optional(),
  transferId: z.number().int().min(0).max(2_147_483_647).optional(),
  pageIndex: z.number().int().min(0).max(10_000).optional(),
  elementCount: z.number().int().min(0).max(1_000_000).optional(),
  publishStartedAt: epoch.optional(),
  firstChunkPublishedAt: epoch.optional(),
  lastChunkPublishedAt: epoch.optional(),
  publishDurationMs: duration.optional(),
  chunkPublishOffsetsMs: offsets.optional(),
  skippedReason: z.string().trim().min(1).max(80).optional(),
  error: z.string().trim().min(1).max(240).optional(),
  receivedAt: epoch.optional(),
  firstChunkReceivedAt: epoch.optional(),
  lastChunkReceivedAt: epoch.optional(),
  chunkReceiveOffsetsMs: offsets.optional(),
  assembledAt: epoch.optional(),
  assemblyDurationMs: duration.optional(),
  missingChunks: z.string().trim().min(1).max(80).optional(),
  chunkBytes: z.string().trim().min(1).max(80).optional(),
  duplicateChunks: z.number().int().min(0).max(10_000).optional(),
  outOfOrderChunks: z.boolean().optional(),
  parsedAt: epoch.optional(),
  parseDurationMs: duration.optional(),
  stateUpdateStartedAt: epoch.optional(),
  stateUpdateCompletedAt: epoch.optional(),
  appliedAt: epoch.optional(),
  ackSentAt: epoch.optional(),
  ackReceivedAt: epoch.optional(),
  ackError: z.string().trim().min(1).max(240).optional(),
  remoteReceivedAt: epoch.optional(),
  remoteParsedAt: epoch.optional(),
  remoteAppliedAt: epoch.optional(),
  remoteAckSentAt: epoch.optional(),
  renderDurationMs: duration.optional(),
  stageWidth: z.number().int().min(0).max(20_000).optional(),
  stageHeight: z.number().int().min(0).max(20_000).optional(),
  devicePixelRatio: z.number().finite().min(0).max(8).optional(),
  duplicateMessage: z.boolean().optional(),
  outOfOrderMessage: z.boolean().optional(),
  ignoreReason: z.string().trim().min(1).max(80).optional(),
  gapSequences: z.string().trim().min(1).max(80).optional(),
});

export type WhiteboardMessageTrace = z.infer<typeof whiteboardMessageSchema>;
export type WhiteboardMessageSlot = (typeof WHITEBOARD_MESSAGE_SLOTS)[number];
export type WhiteboardMessageStatus = (typeof WHITEBOARD_MESSAGE_STATUSES)[number];

const TRACED_TYPES = new Set([
  'WHITEBOARD_SYNC',
  'WHITEBOARD_DELTA',
  'WHITEBOARD_FULL_SYNC',
  'WHITEBOARD_PAGE_INDEX',
  'WHITEBOARD_PAGE_COUNT',
  'WHITEBOARD_REQUEST_SYNC',
  'BOARD_ASSIGN',
  'BOARD_CONTROL',
]);

const ACKED_TYPES = new Set([
  'WHITEBOARD_SYNC',
  'WHITEBOARD_DELTA',
  'WHITEBOARD_FULL_SYNC',
  'WHITEBOARD_PAGE_INDEX',
  'WHITEBOARD_PAGE_COUNT',
  'BOARD_ASSIGN',
  'BOARD_CONTROL',
]);

const STATUS_RANK: Record<WhiteboardMessageStatus, number> = {
  receiving: 1,
  assembled: 2,
  parsed: 3,
  sent: 4,
  applied: 5,
  ack_sent: 6,
  ack_received: 7,
  ignored: 8,
  skipped: 8,
  slow_paint: 8,
  gap: 8,
  send_error: 9,
  receive_error: 9,
};

interface StoredTrace extends WhiteboardMessageTrace {
  dirty: boolean;
}

interface ReceiveCursor {
  last: number;
  seen: number[];
  gapId: string | null;
}

const traces = new Map<string, StoredTrace>();
const cursors = new Map<string, ReceiveCursor>();
let sequence = 0;
let mainThreadGapMs: number | null = null;
let paintTarget: { messageId: string; at: number } | null = null;
let lastSlowPaintAt = 0;

function payloadType(payload: object): string {
  if (!('type' in payload)) return 'unknown';
  const type = payload.type;
  if (typeof type !== 'string') return 'unknown';
  const trimmed = type.trim();
  return trimmed ? trimmed.slice(0, 40) : 'unknown';
}

function clip(value: string | undefined, max: number): string | undefined {
  const trimmed = value?.replace(/[\u0000-\u001F\u007F]/g, '').trim() ?? '';
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function optionalInt(value: number | undefined, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > max) return undefined;
  return rounded;
}

function integerField(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 50_000_000) return null;
  return value;
}

function countElements(record: Record<string, unknown>): number | null {
  if (record.type === 'WHITEBOARD_DELTA') {
    const added = Array.isArray(record.added) ? record.added.length : 0;
    const updated = Array.isArray(record.updated) ? record.updated.length : 0;
    const deleted = Array.isArray(record.deleted) ? record.deleted.length : 0;
    return added + updated + deleted;
  }
  if (Array.isArray(record.elements)) return record.elements.length;
  if (!Array.isArray(record.pages)) return null;
  let total = 0;
  for (const page of record.pages) {
    if (Array.isArray(page)) total += page.length;
  }
  return total;
}

function createMessageId(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `wb_${time}${rand}`.slice(0, 40);
}

function nextSequence(): number {
  sequence += 1;
  if (sequence > 50_000_000) sequence = 1;
  return sequence;
}

function traceKey(messageId: string, slot: WhiteboardMessageSlot, peerIdentity?: string): string {
  return `${messageId}\u0000${slot}\u0000${peerIdentity ?? ''}`;
}

function findKey(messageId: string, slot: WhiteboardMessageSlot): string | undefined {
  const prefix = `${messageId}\u0000${slot}\u0000`;
  for (const key of traces.keys()) {
    if (key.startsWith(prefix)) return key;
  }
  return undefined;
}

function findByTransfer(transferId: number, slot: WhiteboardMessageSlot): StoredTrace | undefined {
  for (const trace of traces.values()) {
    if (trace.slot === slot && trace.transferId === transferId) return trace;
  }
  return undefined;
}

function rank(status: WhiteboardMessageStatus): number {
  return STATUS_RANK[status];
}

function trimStore(): void {
  if (traces.size <= 120) return;
  const ordered = [...traces.entries()].sort((left, right) => left[1].updatedAt - right[1].updatedAt);
  for (const [key, trace] of ordered) {
    if (traces.size <= 120) break;
    if (
      trace.dirty &&
      (trace.status === 'send_error' ||
        trace.status === 'receive_error' ||
        trace.status === 'gap' ||
        trace.status === 'receiving')
    ) {
      continue;
    }
    traces.delete(key);
  }
}

function snapshot(trace: StoredTrace): WhiteboardMessageTrace {
  const copy: WhiteboardMessageTrace = { ...trace };
  delete (copy as Partial<StoredTrace>).dirty;
  if (copy.chunkPublishOffsetsMs) copy.chunkPublishOffsetsMs = [...copy.chunkPublishOffsetsMs];
  if (copy.chunkReceiveOffsetsMs) copy.chunkReceiveOffsetsMs = [...copy.chunkReceiveOffsetsMs];
  return copy;
}

interface Patch extends Partial<WhiteboardMessageTrace> {
  messageId: string;
  slot: WhiteboardMessageSlot;
}

function patch(input: Patch): void {
  try {
    const messageId = clip(input.messageId, 40);
    if (!messageId || messageId.length < 4) return;
    const peerIdentity = clip(input.peerIdentity, 120);
    const existingKey = findKey(messageId, input.slot);
    const key = existingKey ?? traceKey(messageId, input.slot, peerIdentity);
    const previous = traces.get(key);
    const now = Date.now();
    const next: StoredTrace = previous
      ? { ...previous, dirty: true, updatedAt: now }
      : {
          messageId,
          slot: input.slot,
          type: clip(input.type, 40) ?? 'unknown',
          status: input.status ?? 'receiving',
          updatedAt: now,
          dirty: true,
        };
    if (peerIdentity && !next.peerIdentity) next.peerIdentity = peerIdentity;
    const assignText = (field: 'type' | 'destinations' | 'skippedReason' | 'error' | 'missingChunks' | 'chunkBytes' | 'ackError' | 'ignoreReason' | 'gapSequences', max: number) => {
      const value = input[field];
      if (typeof value === 'string') {
        const clipped = clip(value, max);
        if (clipped) next[field] = clipped;
      }
    };
    assignText('type', 40);
    assignText('destinations', 240);
    assignText('skippedReason', 80);
    assignText('error', 240);
    assignText('missingChunks', 80);
    assignText('chunkBytes', 80);
    assignText('ackError', 240);
    assignText('ignoreReason', 80);
    assignText('gapSequences', 80);
    const assignInt = (
      field:
        | 'sequence'
        | 'payloadBytes'
        | 'chunkCount'
        | 'chunksPublished'
        | 'chunksReceived'
        | 'transferId'
        | 'pageIndex'
        | 'elementCount'
        | 'publishStartedAt'
        | 'firstChunkPublishedAt'
        | 'lastChunkPublishedAt'
        | 'publishDurationMs'
        | 'receivedAt'
        | 'firstChunkReceivedAt'
        | 'lastChunkReceivedAt'
        | 'assembledAt'
        | 'assemblyDurationMs'
        | 'duplicateChunks'
        | 'parsedAt'
        | 'parseDurationMs'
        | 'stateUpdateStartedAt'
        | 'stateUpdateCompletedAt'
        | 'appliedAt'
        | 'ackSentAt'
        | 'ackReceivedAt'
        | 'remoteReceivedAt'
        | 'remoteParsedAt'
        | 'remoteAppliedAt'
        | 'remoteAckSentAt'
        | 'renderDurationMs'
        | 'stageWidth'
        | 'stageHeight',
      max: number,
    ) => {
      const value = optionalInt(input[field], max);
      if (value !== undefined) next[field] = value;
    };
    assignInt('sequence', 50_000_000);
    assignInt('payloadBytes', 50_000_000);
    assignInt('chunkCount', 10_000);
    assignInt('chunksPublished', 10_000);
    assignInt('chunksReceived', 10_000);
    assignInt('transferId', 2_147_483_647);
    assignInt('pageIndex', 10_000);
    assignInt('elementCount', 1_000_000);
    assignInt('publishStartedAt', 10_000_000_000_000);
    assignInt('firstChunkPublishedAt', 10_000_000_000_000);
    assignInt('lastChunkPublishedAt', 10_000_000_000_000);
    assignInt('publishDurationMs', 600_000);
    assignInt('receivedAt', 10_000_000_000_000);
    assignInt('firstChunkReceivedAt', 10_000_000_000_000);
    assignInt('lastChunkReceivedAt', 10_000_000_000_000);
    assignInt('assembledAt', 10_000_000_000_000);
    assignInt('assemblyDurationMs', 600_000);
    assignInt('duplicateChunks', 10_000);
    assignInt('parsedAt', 10_000_000_000_000);
    assignInt('parseDurationMs', 600_000);
    assignInt('stateUpdateStartedAt', 10_000_000_000_000);
    assignInt('stateUpdateCompletedAt', 10_000_000_000_000);
    assignInt('appliedAt', 10_000_000_000_000);
    assignInt('ackSentAt', 10_000_000_000_000);
    assignInt('ackReceivedAt', 10_000_000_000_000);
    assignInt('remoteReceivedAt', 10_000_000_000_000);
    assignInt('remoteParsedAt', 10_000_000_000_000);
    assignInt('remoteAppliedAt', 10_000_000_000_000);
    assignInt('remoteAckSentAt', 10_000_000_000_000);
    assignInt('renderDurationMs', 600_000);
    assignInt('stageWidth', 20_000);
    assignInt('stageHeight', 20_000);
    if (typeof input.devicePixelRatio === 'number' && input.devicePixelRatio >= 0 && input.devicePixelRatio <= 8) {
      next.devicePixelRatio = input.devicePixelRatio;
    }
    if (input.outOfOrderChunks) next.outOfOrderChunks = true;
    if (input.duplicateMessage) next.duplicateMessage = true;
    if (input.outOfOrderMessage) next.outOfOrderMessage = true;
    if (input.chunkPublishOffsetsMs && input.chunkPublishOffsetsMs.length > 0) {
      next.chunkPublishOffsetsMs = input.chunkPublishOffsetsMs
        .filter((value) => Number.isFinite(value) && value >= 0 && value <= 600_000)
        .slice(0, 12)
        .map((value) => Math.round(value));
    }
    if (input.chunkReceiveOffsetsMs && input.chunkReceiveOffsetsMs.length > 0) {
      next.chunkReceiveOffsetsMs = input.chunkReceiveOffsetsMs
        .filter((value) => Number.isFinite(value) && value >= 0 && value <= 600_000)
        .slice(0, 12)
        .map((value) => Math.round(value));
    }
    if (input.status && (!previous || rank(input.status) >= rank(previous.status))) next.status = input.status;
    if (
      input.missingChunks === undefined &&
      (next.status === 'assembled' ||
        next.status === 'parsed' ||
        next.status === 'applied' ||
        next.status === 'ack_sent' ||
        next.status === 'ack_received')
    ) {
      delete next.missingChunks;
    }
    traces.set(key, next);
    trimStore();
  } catch {
    // Diagnostics must not change whiteboard delivery.
  }
}

function observeReceiveSequence(sender: string, sequenceNumber: number): void {
  const cursor = cursors.get(sender) ?? { last: 0, seen: [], gapId: null };
  if (cursor.seen.includes(sequenceNumber)) {
    cursors.set(sender, cursor);
    return;
  }
  cursor.seen.push(sequenceNumber);
  if (cursor.seen.length > 100) cursor.seen.shift();
  if (cursor.gapId) {
    const gap = traces.get(findKey(cursor.gapId, 'gap') ?? '');
    if (gap?.gapSequences) {
      const remaining = gap.gapSequences
        .split(',')
        .map((part) => Number(part))
        .filter((part) => Number.isInteger(part) && part !== sequenceNumber);
      patch({
        messageId: gap.messageId,
        slot: 'gap',
        peerIdentity: sender,
        type: 'WHITEBOARD_GAP',
        status: 'gap',
        gapSequences: remaining.length > 0 ? remaining.join(',') : 'none',
      });
      if (remaining.length === 0) cursor.gapId = null;
    }
  }
  if (cursor.last > 0 && sequenceNumber > cursor.last + 1) {
    const missing: number[] = [];
    for (let value = cursor.last + 1; value < sequenceNumber && missing.length < 12; value += 1) missing.push(value);
    const gapId =
      cursor.gapId ?? `gap_${Math.abs(hashIdentity(sender)).toString(36)}_${cursor.last}_${sequenceNumber}`.slice(0, 40);
    const existing = traces.get(findKey(gapId, 'gap') ?? '');
    const prior =
      existing?.gapSequences && existing.gapSequences !== 'none'
        ? existing.gapSequences
            .split(',')
            .map((part) => Number(part))
            .filter((part) => Number.isInteger(part))
        : [];
    const combined = [...new Set([...prior, ...missing])].sort((left, right) => left - right).slice(0, 12);
    cursor.gapId = gapId;
    patch({
      messageId: gapId,
      slot: 'gap',
      peerIdentity: sender,
      type: 'WHITEBOARD_GAP',
      status: 'gap',
      sequence: combined[0],
      gapSequences: combined.join(','),
    });
  }
  if (sequenceNumber < cursor.last) {
    // The caller marks the message itself.
  }
  cursor.last = Math.max(cursor.last, sequenceNumber);
  cursors.set(sender, cursor);
}

function hashIdentity(value: string): number {
  let hash = 0;
  for (const char of value) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return hash;
}

export function shouldTraceWhiteboard(type: string): boolean {
  return TRACED_TYPES.has(type);
}

export function shouldAckWhiteboard(type: string): boolean {
  return ACKED_TYPES.has(type);
}

export function stampWhiteboardPayload(payload: object): object {
  if (Array.isArray(payload)) return payload;
  const record = payload as Record<string, unknown>;
  const type = payloadType(record);
  if (!TRACED_TYPES.has(type)) return payload;
  if (typeof record.messageId === 'string' && record.messageId.startsWith('wb_')) return payload;
  return { messageId: createMessageId(), sequence: nextSequence(), ...record };
}

export interface WhiteboardMessageMeta {
  type: string;
  messageId: string | null;
  sequence: number | null;
  pageIndex: number | null;
  elementCount: number | null;
}

export function whiteboardMessageMeta(payload: object): WhiteboardMessageMeta {
  if (Array.isArray(payload)) {
    return { type: 'unknown', messageId: null, sequence: null, pageIndex: null, elementCount: null };
  }
  const record = payload as Record<string, unknown>;
  return {
    type: payloadType(record),
    messageId: typeof record.messageId === 'string' ? record.messageId.slice(0, 40) : null,
    sequence: integerField(record.sequence),
    pageIndex: integerField(record.pageIndex),
    elementCount: countElements(record),
  };
}

export function destinationText(identities: string[] | null): string | undefined {
  if (identities === null) return 'all participants';
  const cleaned = identities.map((identity) => identity.trim()).filter((identity) => identity.length > 0);
  if (cleaned.length === 0) return 'none';
  return clip(cleaned.join(', '), 240);
}

export interface WhiteboardPublishTrace {
  messageId: string;
  sequence: number | null;
  type: string;
  destinations?: string;
  payloadBytes?: number;
  chunkCount?: number;
  chunksPublished?: number;
  transferId?: number;
  pageIndex?: number;
  elementCount?: number;
  publishStartedAt: number;
  firstChunkPublishedAt?: number;
  lastChunkPublishedAt?: number;
  publishDurationMs?: number;
  chunkPublishOffsetsMs?: number[];
  chunkBytes?: string;
  skippedReason?: string;
  error?: string;
}

export function noteWhiteboardPublish(input: WhiteboardPublishTrace): void {
  patch({
    messageId: input.messageId,
    slot: 'send',
    type: input.type,
    status: input.skippedReason ? 'skipped' : input.error ? 'send_error' : 'sent',
    sequence: input.sequence ?? undefined,
    destinations: input.destinations,
    payloadBytes: input.payloadBytes,
    chunkCount: input.chunkCount,
    chunksPublished: input.chunksPublished,
    transferId: input.transferId,
    pageIndex: input.pageIndex ?? undefined,
    elementCount: input.elementCount ?? undefined,
    publishStartedAt: input.publishStartedAt,
    firstChunkPublishedAt: input.firstChunkPublishedAt,
    lastChunkPublishedAt: input.lastChunkPublishedAt,
    publishDurationMs: input.publishDurationMs,
    chunkPublishOffsetsMs: input.chunkPublishOffsetsMs,
    chunkBytes: input.chunkBytes,
    skippedReason: input.skippedReason,
    error: input.error,
  });
}

export interface WhiteboardChunkTrace {
  messageId: string | null;
  transferId: number | null;
  senderIdentity: string | null;
  chunkIndex: number;
  totalChunks: number;
  byteLength: number;
  at: number;
  duplicate: boolean;
  outOfOrder: boolean;
  invalid: boolean;
  missing: number[];
  receivedCount: number;
  duplicateCount: number;
  firstChunkAt: number;
  lastChunkAt: number;
  complete: boolean;
  expired?: boolean;
  sequence?: number | null;
}

export function noteWhiteboardChunk(input: WhiteboardChunkTrace): void {
  let existing = input.transferId !== null ? findByTransfer(input.transferId, 'receive') : undefined;
  if (existing && input.messageId && existing.messageId !== input.messageId) {
    traces.delete(traceKey(existing.messageId, 'receive', existing.peerIdentity));
    const stale = findKey(existing.messageId, 'receive');
    if (stale) traces.delete(stale);
    existing = { ...existing, messageId: input.messageId };
  }
  const messageId =
    input.messageId ?? existing?.messageId ?? (input.transferId !== null ? `xfer_${input.transferId}` : null);
  if (!messageId) return;
  const offsets = existing?.chunkReceiveOffsetsMs ? [...existing.chunkReceiveOffsetsMs] : [];
  if (!input.duplicate && !input.expired && offsets.length < 12) offsets.push(Math.max(0, input.at - input.firstChunkAt));
  const sizes = existing?.chunkBytes ? existing.chunkBytes.split(',').filter((part) => part.length > 0) : [];
  if (!input.duplicate && !input.expired && sizes.length < 12 && input.byteLength >= 0) {
    sizes.push(String(Math.round(input.byteLength)));
  }
  const missing = input.missing.length > 0 ? input.missing.join(',') : undefined;
  patch({
    messageId,
    slot: 'receive',
    peerIdentity: input.senderIdentity ?? undefined,
    type: existing?.type && existing.type !== 'WHITEBOARD_CHUNK' ? existing.type : 'WHITEBOARD_CHUNK',
    status: input.expired ? 'receiving' : input.complete ? 'assembled' : 'receiving',
    sequence: input.sequence ?? existing?.sequence,
    transferId: input.transferId ?? undefined,
    chunkCount: input.totalChunks,
    chunksReceived: input.receivedCount,
    firstChunkReceivedAt: input.firstChunkAt,
    lastChunkReceivedAt: input.lastChunkAt,
    chunkReceiveOffsetsMs: offsets,
    chunkBytes: sizes.length > 0 ? sizes.join(',').slice(0, 80) : undefined,
    missingChunks: input.expired || !input.complete ? missing : undefined,
    duplicateChunks: input.duplicateCount > 0 ? input.duplicateCount : undefined,
    outOfOrderChunks: input.outOfOrder || undefined,
    error: input.invalid ? 'Invalid whiteboard chunk' : undefined,
    assembledAt: input.complete ? input.at : undefined,
    assemblyDurationMs: input.complete ? Math.max(0, input.lastChunkAt - input.firstChunkAt) : undefined,
  });
}

export function noteWhiteboardParsed(input: {
  messageId: string;
  sequence: number | null;
  type: string;
  senderIdentity: string | null;
  transferId: number | null;
  receivedAt: number;
  parsedAt: number;
  pageIndex: number | null;
  elementCount: number | null;
  payloadBytes?: number;
}): void {
  if (input.transferId !== null && input.messageId.startsWith('wb_')) {
    const provisional = findByTransfer(input.transferId, 'receive');
    if (provisional && provisional.messageId !== input.messageId) {
      traces.delete(traceKey(provisional.messageId, 'receive', provisional.peerIdentity));
      const moved = findKey(provisional.messageId, 'receive');
      if (moved) traces.delete(moved);
      patch({ ...provisional, messageId: input.messageId, slot: 'receive', peerIdentity: input.senderIdentity ?? undefined });
    }
  }
  const sender = input.senderIdentity ?? 'unknown';
  const cursor = cursors.get(sender);
  const duplicate = input.sequence !== null && cursor?.seen.includes(input.sequence) === true;
  const outOfOrder = input.sequence !== null && cursor !== undefined && cursor.last > 0 && input.sequence < cursor.last;
  if (input.sequence !== null) observeReceiveSequence(sender, input.sequence);
  patch({
    messageId: input.messageId,
    slot: 'receive',
    peerIdentity: input.senderIdentity ?? undefined,
    type: input.type,
    status: 'parsed',
    sequence: input.sequence ?? undefined,
    transferId: input.transferId ?? undefined,
    receivedAt: input.receivedAt,
    parsedAt: input.parsedAt,
    parseDurationMs: Math.max(0, input.parsedAt - input.receivedAt),
    pageIndex: input.pageIndex ?? undefined,
    elementCount: input.elementCount ?? undefined,
    payloadBytes: input.payloadBytes,
    duplicateMessage: duplicate || undefined,
    outOfOrderMessage: outOfOrder || undefined,
  });
}

export function noteWhiteboardApplied(input: {
  messageId: string;
  stateUpdateStartedAt: number;
  stateUpdateCompletedAt: number;
  appliedAt: number;
  pageIndex?: number;
  elementCount?: number;
}): void {
  patch({
    messageId: input.messageId,
    slot: 'receive',
    status: 'applied',
    stateUpdateStartedAt: input.stateUpdateStartedAt,
    stateUpdateCompletedAt: input.stateUpdateCompletedAt,
    appliedAt: input.appliedAt,
    pageIndex: input.pageIndex,
    elementCount: input.elementCount,
  });
}

export function noteWhiteboardIgnored(input: { messageId: string; reason: string; at: number }): void {
  patch({
    messageId: input.messageId,
    slot: 'receive',
    status: 'ignored',
    ignoreReason: input.reason,
    appliedAt: undefined,
    stateUpdateCompletedAt: input.at,
  });
}

export function noteWhiteboardReceiveFailure(input: {
  messageId: string | null;
  transferId: number | null;
  type: string;
  message: string;
  at: number;
}): void {
  const existing = input.transferId !== null ? findByTransfer(input.transferId, 'receive') : undefined;
  const messageId = input.messageId ?? existing?.messageId;
  if (!messageId) return;
  patch({
    messageId,
    slot: 'receive',
    type: input.type,
    status: 'receive_error',
    error: input.message,
    parsedAt: input.at,
  });
}

export function noteWhiteboardAckSent(input: { messageId: string; ackSentAt: number }): void {
  patch({
    messageId: input.messageId,
    slot: 'receive',
    status: 'ack_sent',
    ackSentAt: input.ackSentAt,
  });
}

export function noteWhiteboardAckFailed(input: { messageId: string; message: string }): void {
  patch({
    messageId: input.messageId,
    slot: 'receive',
    ackError: input.message,
  });
}

export function noteWhiteboardAckReceived(input: {
  messageId: string;
  sequence?: number;
  ackType: string;
  fromIdentity: string;
  ackReceivedAt: number;
  remoteReceivedAt?: number;
  remoteParsedAt?: number;
  remoteAppliedAt?: number;
  remoteAckSentAt?: number;
}): void {
  patch({
    messageId: input.messageId,
    slot: 'ack',
    peerIdentity: input.fromIdentity,
    type: input.ackType,
    status: 'ack_received',
    sequence: input.sequence,
    ackReceivedAt: input.ackReceivedAt,
    remoteReceivedAt: input.remoteReceivedAt,
    remoteParsedAt: input.remoteParsedAt,
    remoteAppliedAt: input.remoteAppliedAt,
    remoteAckSentAt: input.remoteAckSentAt,
  });
  if (!findKey(input.messageId, 'send')) return;
  patch({
    messageId: input.messageId,
    slot: 'send',
    ackReceivedAt: input.ackReceivedAt,
  });
}

export function expectWhiteboardPaint(messageId: string): void {
  paintTarget = { messageId, at: Date.now() };
}

export function noteWhiteboardPaint(input: {
  elementCount: number;
  stageWidth: number;
  stageHeight: number;
  devicePixelRatio: number;
  renderDurationMs: number;
}): void {
  try {
    const now = Date.now();
    const duration = optionalInt(input.renderDurationMs, 600_000) ?? 0;
    const target = paintTarget && now - paintTarget.at < 2_000 ? paintTarget : null;
    paintTarget = null;
    if (target && findKey(target.messageId, 'receive')) {
      patch({
        messageId: target.messageId,
        slot: 'receive',
        renderDurationMs: duration,
        elementCount: input.elementCount,
        stageWidth: input.stageWidth,
        stageHeight: input.stageHeight,
        devicePixelRatio: input.devicePixelRatio,
      });
      return;
    }
    if (duration < 50 || now - lastSlowPaintAt < 5_000) return;
    lastSlowPaintAt = now;
    const messageId = `paint_${now.toString(36)}${Math.random().toString(36).slice(2, 5)}`.slice(0, 40);
    patch({
      messageId,
      slot: 'paint',
      type: 'CANVAS_PAINT',
      status: 'slow_paint',
      renderDurationMs: duration,
      elementCount: input.elementCount,
      stageWidth: input.stageWidth,
      stageHeight: input.stageHeight,
      devicePixelRatio: input.devicePixelRatio,
    });
  } catch {
    // Paint timing must not affect the canvas.
  }
}

export function noteMainThreadGap(gapMs: number): void {
  const clipped = optionalInt(gapMs, 600_000);
  if (clipped === undefined || clipped < 400) return;
  mainThreadGapMs = Math.max(mainThreadGapMs ?? 0, clipped);
}

export function takeMainThreadGap(): number | null {
  const value = mainThreadGapMs;
  mainThreadGapMs = null;
  return value;
}

export function restoreMainThreadGap(value: number | null): void {
  if (value === null) return;
  mainThreadGapMs = Math.max(mainThreadGapMs ?? 0, value);
}

function isUrgent(trace: StoredTrace): boolean {
  return (
    trace.status === 'send_error' ||
    trace.status === 'receive_error' ||
    trace.status === 'skipped' ||
    trace.status === 'gap' ||
    trace.status === 'receiving' ||
    trace.status === 'ignored' ||
    trace.slot === 'ack'
  );
}

export function takeWhiteboardMessages(): WhiteboardMessageTrace[] {
  const dirty = [...traces.values()].filter((trace) => trace.dirty);
  const urgent = dirty.filter(isUrgent);
  const rest = dirty.filter((trace) => !isUrgent(trace)).sort((left, right) => left.updatedAt - right.updatedAt);
  const room = Math.max(0, 48 - urgent.length);
  const chosen = [...urgent.slice(0, 48), ...rest.slice(-room)];
  const chosenIds = new Set(chosen.map((trace) => traceKey(trace.messageId, trace.slot, trace.peerIdentity)));
  for (const trace of dirty) {
    const key = traceKey(trace.messageId, trace.slot, trace.peerIdentity);
    if (chosenIds.has(key)) trace.dirty = false;
  }
  return chosen.map(snapshot);
}

export function restoreWhiteboardMessages(items: WhiteboardMessageTrace[]): void {
  for (const item of items) {
    const key = traceKey(item.messageId, item.slot, item.peerIdentity);
    const current = traces.get(key);
    if (!current || current.updatedAt <= item.updatedAt) traces.set(key, { ...item, dirty: true });
    else current.dirty = true;
  }
}

export function sanitizeWhiteboardMessages(items: WhiteboardMessageTrace[]): WhiteboardMessageTrace[] {
  const clean: WhiteboardMessageTrace[] = [];
  for (const item of items) {
    const parsed = whiteboardMessageSchema.safeParse(item);
    if (parsed.success) clean.push(parsed.data);
  }
  return clean.slice(0, 48);
}

export function resetWhiteboardMessagesForTests(): void {
  traces.clear();
  cursors.clear();
  sequence = 0;
  mainThreadGapMs = null;
  paintTarget = null;
  lastSlowPaintAt = 0;
}

export interface WhiteboardLivekitSnap {
  name: string;
  at: string;
  rttMs: number | null;
  jitterMs: number | null;
  sendLossPct: number | null;
  receiveLossPct: number | null;
  ice: string | null;
  state: string | null;
  mainThreadGapMs: number | null;
}

export interface WhiteboardDeliveryReceiver {
  name: string;
  identity: string;
  status: string;
  detail: string | null;
  timeline: Array<{ label: string; at: number | null }>;
  durations: Array<{ label: string; ms: number | null }>;
}

export interface WhiteboardDeliveryView {
  messageId: string;
  kind: 'message' | 'gap' | 'paint';
  type: string;
  sequence: number | null;
  payloadBytes: number | null;
  chunkCount: number | null;
  chunkBytes: string | null;
  destinations: string | null;
  pageIndex: number | null;
  elementCount: number | null;
  senderName: string | null;
  senderIdentity: string | null;
  status: string;
  note: string | null;
  timeline: Array<{ label: string; at: number | null }>;
  durations: Array<{ label: string; ms: number | null }>;
  receivers: WhiteboardDeliveryReceiver[];
  sortAt: number;
  instants: string[];
  livekit: WhiteboardLivekitSnap[];
  involvedIdentities: string[];
}

export interface WhiteboardTraceSource {
  name: string;
  identity: string;
  samples: Array<{
    t: string;
    clockOffsetMs?: number | null;
    rttMs?: number | null;
    jitterMs?: number | null;
    sendLossPct?: number | null;
    receiveLossPct?: number | null;
    ice?: string | null;
    state?: string | null;
    mainThreadGapMs?: number | null;
    whiteboardMessages?: WhiteboardMessageTrace[];
  }>;
}

interface OwnedTrace {
  trace: WhiteboardMessageTrace;
  name: string;
  identity: string;
  sampleT: string;
  clockOffsetMs: number | null;
  livekit: WhiteboardLivekitSnap;
}

function livekitOf(source: WhiteboardTraceSource, sample: WhiteboardTraceSource['samples'][number]): WhiteboardLivekitSnap {
  return {
    name: source.name,
    at: sample.t,
    rttMs: sample.rttMs ?? null,
    jitterMs: sample.jitterMs ?? null,
    sendLossPct: sample.sendLossPct ?? null,
    receiveLossPct: sample.receiveLossPct ?? null,
    ice: sample.ice ?? null,
    state: sample.state ?? null,
    mainThreadGapMs: sample.mainThreadGapMs ?? null,
  };
}

function betterStatus(current: WhiteboardMessageStatus, next: WhiteboardMessageStatus): WhiteboardMessageStatus {
  return rank(next) >= rank(current) ? next : current;
}

const CLEAR_MISSING_CHUNKS = new Set<WhiteboardMessageStatus>(['assembled', 'parsed', 'applied', 'ack_sent', 'ack_received']);

export function mergeWhiteboardTraces(current: WhiteboardMessageTrace, incoming: WhiteboardMessageTrace): WhiteboardMessageTrace {
  const older = current.updatedAt <= incoming.updatedAt ? current : incoming;
  const newer = current.updatedAt <= incoming.updatedAt ? incoming : current;
  const merged: WhiteboardMessageTrace = { ...older, ...newer };
  merged.status = betterStatus(older.status, newer.status);
  merged.updatedAt = Math.max(older.updatedAt, newer.updatedAt);
  if (!newer.chunkPublishOffsetsMs && older.chunkPublishOffsetsMs) merged.chunkPublishOffsetsMs = older.chunkPublishOffsetsMs;
  if (!newer.chunkReceiveOffsetsMs && older.chunkReceiveOffsetsMs) merged.chunkReceiveOffsetsMs = older.chunkReceiveOffsetsMs;
  if (newer.gapSequences === 'none') merged.gapSequences = 'none';
  if (CLEAR_MISSING_CHUNKS.has(merged.status)) delete merged.missingChunks;
  return merged;
}

function mergeOwned(items: OwnedTrace[]): OwnedTrace {
  const ordered = [...items].sort((left, right) => left.trace.updatedAt - right.trace.updatedAt);
  let trace = ordered[0].trace;
  let carrier = ordered[0];
  for (const item of ordered.slice(1)) {
    trace = mergeWhiteboardTraces(trace, item.trace);
    carrier = item;
  }
  return { ...carrier, trace };
}

function clockInstant(ms: number, offsetMs: number | null): string[] {
  const instants = [new Date(ms).toISOString()];
  if (typeof offsetMs === 'number' && Number.isFinite(offsetMs) && Math.abs(offsetMs) >= 2000) {
    instants.push(new Date(ms + offsetMs).toISOString());
  }
  return instants;
}

function diffMs(later: number | undefined, earlier: number | undefined): number | null {
  if (later === undefined || earlier === undefined) return null;
  const value = later - earlier;
  if (!Number.isFinite(value) || value < -600_000 || value > 600_000) return null;
  return value;
}

function chunkTimes(start: number | undefined, offsetsMs: number[] | undefined): Array<{ label: string; at: number | null }> {
  if (start === undefined || !offsetsMs || offsetsMs.length <= 1) return [];
  return offsetsMs.map((offset, index) => ({ label: `Chunk ${index + 1}`, at: start + offset }));
}

const RECEIVE_APPLIED = new Set<WhiteboardMessageStatus>(['applied', 'ack_sent', 'ack_received']);
const BENIGN_IGNORE = new Set(['assigned_page', 'empty_delta', 'pristine_board', 'sync_request']);

function receiverStatus(receive: WhiteboardMessageTrace, acked: boolean): string {
  if (receive.status === 'receive_error') return 'Receive failed';
  if (receive.status === 'ignored' && receive.ignoreReason && BENIGN_IGNORE.has(receive.ignoreReason)) return 'Ignored';
  if (receive.status === 'ignored') return 'Not applied';
  if (receive.status === 'receiving' || (receive.missingChunks && !RECEIVE_APPLIED.has(receive.status) && receive.status !== 'parsed' && receive.status !== 'assembled')) {
    return 'Not assembled';
  }
  if (receive.status === 'assembled' || receive.status === 'parsed') return 'Not applied';
  const acknowledged = acked || receive.status === 'ack_sent' || receive.ackSentAt !== undefined;
  if (RECEIVE_APPLIED.has(receive.status) || receive.appliedAt !== undefined) return acknowledged ? 'Applied' : 'ACK missing';
  return 'Not applied';
}

function worstStatus(statuses: string[]): string {
  const order = [
    'Applied',
    'Published',
    'No receiver report',
    'Frame delay',
    'Missing sequence',
    'ACK missing',
    'Not received',
    'Not applied',
    'Not assembled',
    'Receive failed',
    'Not sent',
    'Send failed',
  ];
  let worst = statuses[0] ?? 'No receiver report';
  for (const status of statuses) {
    if (order.indexOf(status) > order.indexOf(worst)) worst = status;
  }
  return worst;
}

function receiveTimeline(receive: WhiteboardMessageTrace): Array<{ label: string; at: number | null }> {
  return [
    { label: 'First chunk received', at: receive.firstChunkReceivedAt ?? null },
    { label: 'Last chunk received', at: receive.lastChunkReceivedAt ?? null },
    ...chunkTimes(receive.firstChunkReceivedAt, receive.chunkReceiveOffsetsMs).map((point) => ({
      label: `${point.label} received`,
      at: point.at,
    })),
    { label: 'Assembled', at: receive.assembledAt ?? null },
    { label: 'Parsed', at: receive.parsedAt ?? null },
    { label: 'State update started', at: receive.stateUpdateStartedAt ?? null },
    { label: 'React state updated', at: receive.appliedAt ?? null },
    { label: 'ACK sent', at: receive.ackSentAt ?? null },
  ];
}

function receiveDurations(receive: WhiteboardMessageTrace, ack: WhiteboardMessageTrace | undefined, send: WhiteboardMessageTrace | undefined): Array<{ label: string; ms: number | null }> {
  return [
    { label: 'Assembly', ms: receive.assemblyDurationMs ?? diffMs(receive.assembledAt, receive.firstChunkReceivedAt) },
    { label: 'Parse', ms: receive.parseDurationMs ?? null },
    { label: 'Apply', ms: diffMs(receive.stateUpdateCompletedAt ?? receive.appliedAt, receive.stateUpdateStartedAt) },
    { label: 'Render', ms: receive.renderDurationMs ?? null },
    { label: 'Receive to apply', ms: diffMs(receive.appliedAt, receive.receivedAt ?? receive.firstChunkReceivedAt) },
    { label: 'Apply to ACK', ms: diffMs(receive.ackSentAt, receive.appliedAt) },
    {
      label: 'Send to ACK (sender clock)',
      ms: diffMs(ack?.ackReceivedAt ?? send?.ackReceivedAt, send?.publishStartedAt),
    },
    {
      label: 'Send to receive (clocks may differ)',
      ms: diffMs(receive.receivedAt ?? receive.firstChunkReceivedAt, send?.lastChunkPublishedAt ?? send?.publishStartedAt),
    },
  ];
}

function includesSequence(list: string | undefined, sequenceNumber: number): boolean {
  if (!list || list === 'none') return false;
  return list.split(',').some((part) => Number(part) === sequenceNumber);
}

export function buildWhiteboardDeliveries(sources: WhiteboardTraceSource[]): WhiteboardDeliveryView[] {
  const owned: OwnedTrace[] = [];
  for (const source of sources) {
    for (const sample of source.samples) {
      for (const trace of sample.whiteboardMessages ?? []) {
        owned.push({
          trace,
          name: source.name,
          identity: source.identity,
          sampleT: sample.t,
          clockOffsetMs: sample.clockOffsetMs ?? null,
          livekit: livekitOf(source, sample),
        });
      }
    }
  }

  const transferToMessage = new Map<number, string>();
  for (const item of owned) {
    if (item.trace.slot === 'send' && item.trace.transferId !== undefined && item.trace.messageId.startsWith('wb_')) {
      transferToMessage.set(item.trace.transferId, item.trace.messageId);
    }
  }

  const groups = new Map<string, OwnedTrace[]>();
  for (const item of owned) {
    let messageId = item.trace.messageId;
    if (messageId.startsWith('xfer_') && item.trace.transferId !== undefined) {
      messageId = transferToMessage.get(item.trace.transferId) ?? messageId;
    }
    const group = groups.get(messageId) ?? [];
    group.push(item);
    groups.set(messageId, group);
  }

  const views: WhiteboardDeliveryView[] = [];
  for (const [messageId, group] of groups) {
    const merged = new Map<string, OwnedTrace>();
    for (const item of group) {
      const key = `${item.trace.slot}\u0000${item.identity}\u0000${item.trace.peerIdentity ?? ''}`;
      const existing = merged.get(key);
      merged.set(key, existing ? mergeOwned([existing, item]) : item);
    }
    const records = [...merged.values()];
    const send = records.find((item) => item.trace.slot === 'send');
    const receives = records.filter((item) => item.trace.slot === 'receive');
    const acks = records.filter((item) => item.trace.slot === 'ack');
    const gap = records.find((item) => item.trace.slot === 'gap');
    const paint = records.find((item) => item.trace.slot === 'paint');
    if (gap && gap.trace.gapSequences === 'none') continue;

    const primary = send ?? receives[0] ?? acks[0] ?? gap ?? paint;
    if (!primary) continue;
    const trace = primary.trace;
    const instants = new Set<string>();
    const livekit: WhiteboardLivekitSnap[] = [];
    const involved = new Set<string>();
    for (const item of records) {
      involved.add(item.identity);
      if (item.trace.peerIdentity) involved.add(item.trace.peerIdentity);
      instants.add(item.sampleT);
      livekit.push(item.livekit);
      for (const ms of [
        item.trace.publishStartedAt,
        item.trace.receivedAt,
        item.trace.appliedAt,
        item.trace.ackReceivedAt,
        item.trace.updatedAt,
      ]) {
        if (ms !== undefined) {
          for (const instant of clockInstant(ms, item.clockOffsetMs)) instants.add(instant);
        }
      }
    }

    if (paint) {
      views.push({
        messageId,
        kind: 'paint',
        type: 'CANVAS_PAINT',
        sequence: null,
        payloadBytes: null,
        chunkCount: null,
        chunkBytes: null,
        destinations: null,
        pageIndex: null,
        elementCount: paint.trace.elementCount ?? null,
        senderName: paint.name,
        senderIdentity: paint.identity,
        status: 'Frame delay',
        note: 'Two animation frames passed after the elements update before the browser painted. This is frame delay, not Konva draw time, and it is not evidence that a whiteboard message was lost.',
        timeline: [],
        durations: [{ label: 'Render', ms: paint.trace.renderDurationMs ?? null }],
        receivers: [],
        sortAt: paint.trace.updatedAt,
        instants: [...instants],
        livekit,
        involvedIdentities: [...involved],
      });
      continue;
    }

    if (gap && !send && receives.length === 0) {
      views.push({
        messageId,
        kind: 'gap',
        type: 'WHITEBOARD_GAP',
        sequence: gap.trace.sequence ?? null,
        payloadBytes: null,
        chunkCount: null,
        chunkBytes: null,
        destinations: null,
        pageIndex: null,
        elementCount: null,
        senderName: null,
        senderIdentity: gap.trace.peerIdentity ?? null,
        status: 'Missing sequence',
        note: `${gap.name} applied sequences that skipped ${gap.trace.gapSequences ?? 'a number'}. That shows a hole in what this browser handled. It does not by itself show whether the sender published the missing message.`,
        timeline: [],
        durations: [],
        receivers: [{ name: gap.name, identity: gap.identity, status: 'Not received', detail: gap.trace.gapSequences ?? null, timeline: [], durations: [] }],
        sortAt: gap.trace.updatedAt,
        instants: [...instants],
        livekit,
        involvedIdentities: [...involved],
      });
      continue;
    }

    const receivers: WhiteboardDeliveryReceiver[] = receives.map((item) => {
      const ack = acks.find((candidate) => candidate.trace.peerIdentity === item.identity);
      const status = receiverStatus(item.trace, Boolean(ack || (acks.length === 1 && receives.length === 1)));
      const detail =
        [
          item.trace.status === 'receiving' && item.trace.missingChunks ? `Missing chunks ${item.trace.missingChunks}` : null,
          item.trace.duplicateChunks ? `Duplicate chunks ${item.trace.duplicateChunks}` : null,
          item.trace.outOfOrderChunks ? 'Chunks arrived out of order' : null,
          item.trace.duplicateMessage ? 'Duplicate message' : null,
          item.trace.outOfOrderMessage ? 'Message arrived out of order' : null,
          item.trace.error ?? null,
          item.trace.ackError ?? null,
          item.trace.ignoreReason ?? null,
        ]
          .filter((part): part is string => Boolean(part))
          .join(' · ') || null;
      return {
        name: item.name,
        identity: item.identity,
        status,
        detail,
        timeline: receiveTimeline(item.trace),
        durations: receiveDurations(item.trace, ack?.trace, send?.trace),
      };
    });

    const sentSequence = send?.trace.sequence;
    if (send && sentSequence !== undefined) {
      const seenReceivers = new Set(receivers.map((receiver) => receiver.identity));
      for (const item of owned) {
        if (item.trace.slot !== 'gap' || !includesSequence(item.trace.gapSequences, sentSequence)) continue;
        if (item.trace.peerIdentity && item.trace.peerIdentity !== send.identity) continue;
        if (seenReceivers.has(item.identity)) continue;
        seenReceivers.add(item.identity);
        receivers.push({
          name: item.name,
          identity: item.identity,
          status: 'Not received',
          detail: `Sequence log jumped over ${sentSequence}`,
          timeline: [],
          durations: [],
        });
      }
    }

    let status = 'No receiver report';
    let note: string | null = null;
    if (send?.trace.status === 'send_error') {
      status = 'Send failed';
      note = send.trace.error ?? null;
    } else if (send?.trace.status === 'skipped') {
      status = 'Not sent';
      note = send.trace.skippedReason ?? 'Publish was skipped before it reached LiveKit.';
    } else if (receivers.length > 0) {
      status = worstStatus(receivers.map((receiver) => receiver.status));
    } else if (send) {
      status = 'No receiver report';
      note = 'The sender published this message. No receiver report for it is stored, so this does not show whether the other browser got it.';
    }

    const senderTimeline = send
      ? [
          { label: 'Publish started', at: send.trace.publishStartedAt ?? null },
          { label: 'First chunk sent', at: send.trace.firstChunkPublishedAt ?? null },
          { label: 'Last chunk sent', at: send.trace.lastChunkPublishedAt ?? null },
          ...chunkTimes(send.trace.publishStartedAt, send.trace.chunkPublishOffsetsMs).map((point) => ({
            label: `${point.label} sent`,
            at: point.at,
          })),
          { label: 'ACK received', at: send.trace.ackReceivedAt ?? acks[0]?.trace.ackReceivedAt ?? null },
        ]
      : [];

    views.push({
      messageId,
      kind: 'message',
      type: send?.trace.type ?? receives[0]?.trace.type ?? acks[0]?.trace.type ?? 'unknown',
      sequence: send?.trace.sequence ?? receives[0]?.trace.sequence ?? acks[0]?.trace.sequence ?? null,
      payloadBytes: send?.trace.payloadBytes ?? receives[0]?.trace.payloadBytes ?? null,
      chunkCount: send?.trace.chunkCount ?? receives[0]?.trace.chunkCount ?? null,
      chunkBytes: send?.trace.chunkBytes ?? receives[0]?.trace.chunkBytes ?? null,
      destinations: send?.trace.destinations ?? null,
      pageIndex: send?.trace.pageIndex ?? receives[0]?.trace.pageIndex ?? null,
      elementCount: send?.trace.elementCount ?? receives[0]?.trace.elementCount ?? null,
      senderName: send?.name ?? null,
      senderIdentity: send?.identity ?? receives[0]?.trace.peerIdentity ?? null,
      status,
      note,
      timeline: senderTimeline,
      durations: [{ label: 'Publish', ms: send?.trace.publishDurationMs ?? diffMs(send?.trace.lastChunkPublishedAt, send?.trace.publishStartedAt) }],
      receivers,
      sortAt: send?.trace.publishStartedAt ?? receives[0]?.trace.receivedAt ?? primary.trace.updatedAt,
      instants: [...instants],
      livekit,
      involvedIdentities: [...involved],
    });
  }

  views.sort((left, right) => left.sortAt - right.sortAt);
  return views;
}
