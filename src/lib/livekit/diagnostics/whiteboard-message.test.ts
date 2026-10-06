import assert from 'node:assert/strict';
import { TextDecoder, TextEncoder } from 'node:util';
import { ChunkAssembler, chunkPayloadDetailed } from '../../../components/lms/classroom/ClassWhiteboard/utils/chunk';
import {
  buildWhiteboardDeliveries,
  noteWhiteboardAckReceived,
  noteWhiteboardAckSent,
  noteWhiteboardApplied,
  noteWhiteboardChunk,
  noteWhiteboardParsed,
  noteWhiteboardPublish,
  resetWhiteboardMessagesForTests,
  sanitizeWhiteboardMessages,
  stampWhiteboardPayload,
  takeWhiteboardMessages,
  whiteboardMessageMeta,
} from './whiteboard-message';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function lifecycle() {
  resetWhiteboardMessagesForTests();
  const stamped = stampWhiteboardPayload({
    type: 'WHITEBOARD_SYNC',
    pageIndex: 0,
    elements: [{ id: 'stroke-1' }],
  });
  const meta = whiteboardMessageMeta(stamped);
  assert.equal(typeof meta.messageId, 'string');
  assert.ok(meta.messageId?.startsWith('wb_'));
  assert.equal(meta.sequence, 1);
  const again = stampWhiteboardPayload(stamped);
  assert.equal(whiteboardMessageMeta(again).messageId, meta.messageId);
  assert.equal(stampWhiteboardPayload({ type: 'WHITEBOARD_LASER', point: null }).hasOwnProperty('messageId'), false);
  assert.equal(
    stampWhiteboardPayload({ type: 'WHITEBOARD_ACK', messageId: meta.messageId, sequence: 1 }).hasOwnProperty('sequence'),
    true,
  );
  const ackMeta = whiteboardMessageMeta(
    stampWhiteboardPayload({ type: 'WHITEBOARD_ACK', messageId: meta.messageId, sequence: 1 }),
  );
  assert.equal(ackMeta.sequence, 1);

  const started = 1_000;
  const bytes = encoder.encode(JSON.stringify(stamped));
  const chunked = chunkPayloadDetailed(bytes);
  noteWhiteboardPublish({
    messageId: meta.messageId ?? '',
    sequence: meta.sequence,
    type: 'WHITEBOARD_SYNC',
    destinations: 'student-a, student-b',
    payloadBytes: bytes.length,
    chunkCount: chunked.chunks.length,
    chunksPublished: chunked.chunks.length,
    transferId: chunked.transferId ?? undefined,
    pageIndex: 0,
    elementCount: 1,
    publishStartedAt: started,
    firstChunkPublishedAt: started + 4,
    lastChunkPublishedAt: started + 12,
    publishDurationMs: 12,
    chunkPublishOffsetsMs: [4, 12].slice(0, chunked.chunks.length),
  });
  const teacher = takeWhiteboardMessages();

  const assembler = new ChunkAssembler();
  let payload: Uint8Array | null = null;
  for (const chunk of chunked.chunks) {
    const result = assembler.pushDetailed(chunk);
    noteWhiteboardChunk({
      messageId: result.observation.messageId,
      transferId: result.observation.transferId,
      senderIdentity: 'teacher-1',
      chunkIndex: result.observation.chunkIndex,
      totalChunks: result.observation.totalChunks,
      byteLength: result.observation.payloadBytes,
      at: 2_000 + result.observation.chunkIndex,
      duplicate: result.observation.duplicate,
      outOfOrder: result.observation.outOfOrder,
      invalid: result.observation.invalid,
      missing: result.observation.missing,
      receivedCount: result.observation.receivedCount,
      duplicateCount: result.observation.duplicateCount,
      firstChunkAt: 2_000,
      lastChunkAt: 2_000 + result.observation.chunkIndex,
      complete: result.observation.complete,
      sequence: result.observation.sequence,
    });
    payload = result.payload ?? payload;
  }
  assert.ok(payload);
  const parsed = JSON.parse(decoder.decode(payload)) as { messageId?: string; sequence?: number };
  assert.equal(parsed.messageId, meta.messageId);
  assert.equal(parsed.sequence, 1);
  noteWhiteboardParsed({
    messageId: meta.messageId ?? '',
    sequence: 1,
    type: 'WHITEBOARD_SYNC',
    senderIdentity: 'teacher-1',
    transferId: chunked.transferId,
    receivedAt: 2_010,
    parsedAt: 2_012,
    pageIndex: 0,
    elementCount: 1,
  });
  noteWhiteboardApplied({
    messageId: meta.messageId ?? '',
    stateUpdateStartedAt: 2_012,
    stateUpdateCompletedAt: 2_020,
    appliedAt: 2_020,
    pageIndex: 0,
    elementCount: 1,
  });
  noteWhiteboardAckSent({ messageId: meta.messageId ?? '', ackSentAt: 2_025 });
  const student = takeWhiteboardMessages();
  noteWhiteboardAckReceived({
    messageId: meta.messageId ?? '',
    sequence: 1,
    ackType: 'WHITEBOARD_SYNC',
    fromIdentity: 'student-1',
    ackReceivedAt: 2_040,
    remoteReceivedAt: 2_010,
    remoteAppliedAt: 2_020,
    remoteAckSentAt: 2_025,
  });
  const teacherAck = takeWhiteboardMessages();

  const views = buildWhiteboardDeliveries([
    {
      name: 'Teacher',
      identity: 'teacher-1',
      samples: [
        { t: '2026-10-03T07:19:02.000Z', rttMs: 96, jitterMs: 24, sendLossPct: 0, ice: 'connected', state: 'connected', whiteboardMessages: teacher },
        { t: '2026-10-03T07:19:03.000Z', rttMs: 96, jitterMs: 24, sendLossPct: 0, ice: 'connected', state: 'connected', whiteboardMessages: teacherAck },
      ],
    },
    {
      name: 'Student',
      identity: 'student-1',
      samples: [
        { t: '2026-10-03T07:19:02.100Z', rttMs: 80, jitterMs: 10, sendLossPct: 0, ice: 'connected', state: 'connected', whiteboardMessages: student },
      ],
    },
  ]);
  const delivery = views.find((view) => view.messageId === meta.messageId);
  assert.ok(delivery);
  assert.equal(delivery.status, 'Applied');
  assert.equal(delivery.sequence, 1);
  assert.equal(delivery.receivers[0]?.status, 'Applied');
  assert.equal(delivery.receivers[0]?.durations.find((item) => item.label === 'Apply')?.ms, 8);
  assert.equal(sanitizeWhiteboardMessages(teacher).length, teacher.length);
}

function gapsAndAssembly() {
  resetWhiteboardMessagesForTests();
  for (const sequence of [1, 2, 4]) {
    noteWhiteboardParsed({
      messageId: `wb_seq${sequence}xxxx`,
      sequence,
      type: 'WHITEBOARD_SYNC',
      senderIdentity: 'teacher-1',
      transferId: null,
      receivedAt: 3_000 + sequence,
      parsedAt: 3_001 + sequence,
      pageIndex: 0,
      elementCount: 1,
    });
  }
  const received = takeWhiteboardMessages();
  const gap = received.find((trace) => trace.slot === 'gap');
  assert.ok(gap);
  assert.equal(gap.gapSequences, '3');

  const assembler = new ChunkAssembler();
  const large = encoder.encode(JSON.stringify({ messageId: 'wb_bigmessage1', sequence: 9, type: 'WHITEBOARD_FULL_SYNC', pages: ['x'.repeat(40_000)] }));
  const parts = chunkPayloadDetailed(large);
  assert.ok(parts.chunks.length >= 3);
  const first = assembler.pushDetailed(parts.chunks[0] as Uint8Array);
  assert.equal(first.payload, null);
  assert.equal(first.observation.messageId, 'wb_bigmessage1');
  const third = assembler.pushDetailed(parts.chunks[2] as Uint8Array);
  assert.equal(third.observation.outOfOrder, true);
  const expired = assembler.takeExpired(Date.now() + 11_000);
  assert.equal(expired.length, 1);
  assert.equal(expired[0]?.expired, true);
  assert.ok(expired[0]?.missing.includes(1));
  noteWhiteboardChunk({
    messageId: expired[0]?.messageId ?? null,
    transferId: expired[0]?.transferId ?? null,
    senderIdentity: 'teacher-1',
    chunkIndex: 0,
    totalChunks: expired[0]?.totalChunks ?? 0,
    byteLength: expired[0]?.payloadBytes ?? 0,
    at: expired[0]?.lastChunkAt ?? 0,
    duplicate: false,
    outOfOrder: expired[0]?.outOfOrder ?? false,
    invalid: false,
    missing: expired[0]?.missing ?? [],
    receivedCount: expired[0]?.receivedCount ?? 0,
    duplicateCount: expired[0]?.duplicateCount ?? 0,
    firstChunkAt: expired[0]?.firstChunkAt ?? 0,
    lastChunkAt: expired[0]?.lastChunkAt ?? 0,
    complete: false,
    expired: true,
    sequence: 9,
  });
  const traces = takeWhiteboardMessages();
  const partial = traces.find((trace) => trace.messageId === 'wb_bigmessage1' || trace.transferId === parts.transferId);
  assert.ok(partial);
  assert.equal(partial.status, 'receiving');
  const views = buildWhiteboardDeliveries([
    {
      name: 'Student',
      identity: 'student-1',
      samples: [{ t: '2026-10-03T07:19:10.000Z', whiteboardMessages: traces }],
    },
  ]);
  const partialView = views.find((view) => view.messageId === partial.messageId);
  assert.equal(partialView?.receivers[0]?.status ?? partialView?.status, 'Not assembled');
}

function labelFixes() {
  const views = buildWhiteboardDeliveries([
    {
      name: 'Student',
      identity: 'student-1',
      samples: [
        {
          t: '2026-10-03T07:20:00.000Z',
          whiteboardMessages: [
            {
              messageId: 'wb_stalechunks1',
              slot: 'receive',
              type: 'WHITEBOARD_DELTA',
              status: 'receiving',
              updatedAt: 1,
              missingChunks: '1',
              peerIdentity: 'teacher-1',
            },
            {
              messageId: 'wb_stalechunks1',
              slot: 'receive',
              type: 'WHITEBOARD_DELTA',
              status: 'applied',
              updatedAt: 2,
              appliedAt: 2,
              ackSentAt: 3,
              peerIdentity: 'teacher-1',
            },
            {
              messageId: 'wb_ignoredpage1',
              slot: 'receive',
              type: 'WHITEBOARD_DELTA',
              status: 'ignored',
              updatedAt: 4,
              ignoreReason: 'assigned_page',
              peerIdentity: 'teacher-1',
            },
            {
              messageId: 'wb_appliedok01',
              slot: 'receive',
              type: 'WHITEBOARD_DELTA',
              status: 'applied',
              updatedAt: 5,
              appliedAt: 5,
              ackSentAt: 6,
              peerIdentity: 'teacher-1',
            },
            {
              messageId: 'wb_acksentonly1',
              slot: 'receive',
              type: 'WHITEBOARD_DELTA',
              status: 'ack_sent',
              updatedAt: 7,
              appliedAt: 7,
              ackSentAt: 8,
              peerIdentity: 'teacher-1',
            },
            {
              messageId: 'wb_ackmissing1',
              slot: 'receive',
              type: 'WHITEBOARD_DELTA',
              status: 'applied',
              updatedAt: 9,
              appliedAt: 9,
              peerIdentity: 'teacher-1',
            },
            {
              messageId: 'paint_framedelay1',
              slot: 'paint',
              type: 'CANVAS_PAINT',
              status: 'slow_paint',
              updatedAt: 10,
              renderDurationMs: 80,
            },
          ],
        },
      ],
    },
    {
      name: 'Other student',
      identity: 'student-2',
      samples: [
        {
          t: '2026-10-03T07:20:00.100Z',
          whiteboardMessages: [
            {
              messageId: 'wb_appliedok01',
              slot: 'receive',
              type: 'WHITEBOARD_DELTA',
              status: 'ignored',
              updatedAt: 6,
              ignoreReason: 'empty_delta',
              peerIdentity: 'teacher-1',
            },
          ],
        },
      ],
    },
  ]);

  const stale = views.find((view) => view.messageId === 'wb_stalechunks1');
  assert.equal(stale?.receivers[0]?.status, 'Applied');
  assert.equal(stale?.receivers[0]?.detail ?? null, null);
  assert.equal(
    stale?.receivers[0]?.timeline.some((point) => point.label === 'React state updated'),
    true,
  );

  const ignored = views.find((view) => view.messageId === 'wb_ignoredpage1');
  assert.equal(ignored?.receivers[0]?.status, 'Ignored');
  assert.equal(ignored?.status, 'Ignored');

  const mixed = views.find((view) => view.messageId === 'wb_appliedok01');
  assert.equal(mixed?.status, 'Applied');
  assert.equal(mixed?.receivers.some((receiver) => receiver.status === 'Ignored'), true);

  const acked = views.find((view) => view.messageId === 'wb_acksentonly1');
  assert.equal(acked?.receivers[0]?.status, 'Applied');

  const missingAck = views.find((view) => view.messageId === 'wb_ackmissing1');
  assert.equal(missingAck?.receivers[0]?.status, 'ACK missing');

  const paint = views.find((view) => view.messageId === 'paint_framedelay1');
  assert.equal(paint?.status, 'Frame delay');
  assert.match(paint?.note ?? '', /frame delay/i);
}

lifecycle();
gapsAndAssembly();
labelFixes();
console.log('whiteboard message diagnostics tests passed');
