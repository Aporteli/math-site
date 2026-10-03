//CUT დასაჭერელია

import {
  CHUNK_HEADER_BYTES,
  CHUNK_PAYLOAD_BYTES,
  MAGIC_CHUNK_CONT,
  MAGIC_CHUNK_END,
  MAGIC_CHUNK_START,
} from '../constants/chunk';

export function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

export interface ChunkedPayload {
  chunks: Uint8Array[];
  transferId: number | null;
}

export function chunkPayloadDetailed(bytes: Uint8Array): ChunkedPayload {
  if (bytes.length <= CHUNK_PAYLOAD_BYTES) return { chunks: [bytes], transferId: null };

  const transferId = Math.floor(Math.random() * 0x7fffffff) >>> 0;
  const totalChunks = Math.ceil(bytes.length / CHUNK_PAYLOAD_BYTES);
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_PAYLOAD_BYTES;
    const end = Math.min(start + CHUNK_PAYLOAD_BYTES, bytes.length);
    const magic = i === 0 ? MAGIC_CHUNK_START : i === totalChunks - 1 ? MAGIC_CHUNK_END : MAGIC_CHUNK_CONT;

    const header = new Uint8Array(CHUNK_HEADER_BYTES);
    const view = new DataView(header.buffer);
    header[0] = magic;
    view.setUint32(1, transferId, false);
    view.setUint32(5, i, false);
    view.setUint32(9, totalChunks, false);

    chunks.push(concatBytes(header, bytes.subarray(start, end)));
  }

  return { chunks, transferId };
}

export function chunkPayload(bytes: Uint8Array): Uint8Array[] {
  return chunkPayloadDetailed(bytes).chunks;
}

export interface ChunkObservation {
  transferId: number | null;
  chunkIndex: number;
  totalChunks: number;
  payloadBytes: number;
  duplicate: boolean;
  outOfOrder: boolean;
  invalid: boolean;
  complete: boolean;
  missing: number[];
  receivedCount: number;
  duplicateCount: number;
  firstChunkAt: number;
  lastChunkAt: number;
  expired: boolean;
  messageId: string | null;
  sequence: number | null;
}

export interface ChunkPushResult {
  payload: Uint8Array | null;
  observation: ChunkObservation;
}

interface PendingEntry {
  totalChunks: number;
  chunks: (Uint8Array | null)[];
  received: number;
  createdAt: number;
  firstChunkAt: number;
  lastChunkAt: number;
  duplicateCount: number;
  outOfOrder: boolean;
}

const MESSAGE_ID_PATTERN = /"messageId":"(wb_[0-9a-z]{6,32})"/;
const SEQUENCE_PATTERN = /"sequence":(\d{1,9})/;

export function sniffWhiteboardIdentity(bytes: Uint8Array): { messageId: string | null; sequence: number | null } {
  const sample = bytes.subarray(0, Math.min(bytes.length, 180));
  const text = new TextDecoder().decode(sample);
  const messageMatch = MESSAGE_ID_PATTERN.exec(text);
  const sequenceMatch = SEQUENCE_PATTERN.exec(text);
  const sequence = sequenceMatch ? Number(sequenceMatch[1]) : null;
  return {
    messageId: messageMatch?.[1] ?? null,
    sequence: sequence !== null && Number.isInteger(sequence) ? sequence : null,
  };
}

function missingIndexes(entry: PendingEntry): number[] {
  const missing: number[] = [];
  const total = Math.min(entry.totalChunks, entry.chunks.length);
  for (let index = 0; index < total; index += 1) {
    if (!entry.chunks[index]) missing.push(index);
    if (missing.length >= 12) break;
  }
  return missing;
}

function observeEntry(
  transferId: number | null,
  entry: PendingEntry,
  chunkIndex: number,
  duplicate: boolean,
  outOfOrder: boolean,
  complete: boolean,
  expired: boolean,
  identityBytes: Uint8Array | null,
): ChunkObservation {
  const identity = identityBytes ? sniffWhiteboardIdentity(identityBytes) : { messageId: null, sequence: null };
  return {
    transferId,
    chunkIndex,
    totalChunks: entry.totalChunks,
    payloadBytes: identityBytes?.length ?? 0,
    duplicate,
    outOfOrder: outOfOrder || entry.outOfOrder,
    invalid: false,
    complete,
    missing: complete ? [] : missingIndexes(entry),
    receivedCount: entry.received,
    duplicateCount: entry.duplicateCount,
    firstChunkAt: entry.firstChunkAt,
    lastChunkAt: entry.lastChunkAt,
    expired,
    messageId: identity.messageId,
    sequence: identity.sequence,
  };
}

export class ChunkAssembler {
  private pending = new Map<number, PendingEntry>();
  private expired: ChunkObservation[] = [];

  push(bytes: Uint8Array): Uint8Array | null {
    return this.pushDetailed(bytes).payload;
  }

  pushDetailed(bytes: Uint8Array): ChunkPushResult {
    if (bytes.length < CHUNK_HEADER_BYTES || !this.isChunkMagic(bytes[0])) {
      const now = Date.now();
      const identity = sniffWhiteboardIdentity(bytes);
      return {
        payload: bytes,
        observation: {
          transferId: null,
          chunkIndex: 0,
          totalChunks: 1,
          payloadBytes: bytes.length,
          duplicate: false,
          outOfOrder: false,
          invalid: false,
          complete: true,
          missing: [],
          receivedCount: 1,
          duplicateCount: 0,
          firstChunkAt: now,
          lastChunkAt: now,
          expired: false,
          messageId: identity.messageId,
          sequence: identity.sequence,
        },
      };
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const transferId = view.getUint32(1, false);
    const chunkIndex = view.getUint32(5, false);
    const totalChunks = view.getUint32(9, false);
    const data = bytes.subarray(CHUNK_HEADER_BYTES);
    const magic = bytes[0];
    const now = Date.now();

    if (totalChunks === 0 || totalChunks > 4096 || chunkIndex >= totalChunks) {
      return {
        payload: null,
        observation: {
          transferId,
          chunkIndex,
          totalChunks,
          payloadBytes: data.length,
          duplicate: false,
          outOfOrder: false,
          invalid: true,
          complete: false,
          missing: [],
          receivedCount: 0,
          duplicateCount: 0,
          firstChunkAt: now,
          lastChunkAt: now,
          expired: false,
          messageId: null,
          sequence: null,
        },
      };
    }

    let duplicate = false;
    let outOfOrder = false;

    if (magic === MAGIC_CHUNK_START) {
      const entry: PendingEntry = {
        totalChunks,
        chunks: new Array<Uint8Array | null>(totalChunks).fill(null),
        received: 0,
        createdAt: now,
        firstChunkAt: now,
        lastChunkAt: now,
        duplicateCount: 0,
        outOfOrder: false,
      };
      if (chunkIndex < totalChunks) {
        outOfOrder = chunkIndex !== 0;
        entry.chunks[chunkIndex] = data;
        entry.received += 1;
        entry.outOfOrder = outOfOrder;
      }
      this.pending.set(transferId, entry);
    } else {
      const entry = this.pending.get(transferId);
      if (!entry) {
        return {
          payload: null,
          observation: {
            transferId,
            chunkIndex,
            totalChunks,
            payloadBytes: data.length,
            duplicate: false,
            outOfOrder: false,
            invalid: true,
            complete: false,
            missing: [],
            receivedCount: 0,
            duplicateCount: 0,
            firstChunkAt: now,
            lastChunkAt: now,
            expired: false,
            messageId: sniffWhiteboardIdentity(data).messageId,
            sequence: sniffWhiteboardIdentity(data).sequence,
          },
        };
      }
      if (chunkIndex < entry.totalChunks && !entry.chunks[chunkIndex]) {
        outOfOrder = chunkIndex !== entry.received;
        entry.chunks[chunkIndex] = data;
        entry.received += 1;
        if (outOfOrder) entry.outOfOrder = true;
      } else if (chunkIndex < entry.totalChunks && entry.chunks[chunkIndex]) {
        duplicate = true;
        entry.duplicateCount += 1;
      }
      entry.lastChunkAt = now;
      // Keep the transfer alive while chunks are still flowing. Otherwise a
      // large (many-chunk) full sync can take longer than the absolute
      // 10s window below and get torn down mid-transfer.
      entry.createdAt = now;
    }

    const entry = this.pending.get(transferId);
    if (!entry || entry.received < entry.totalChunks) {
      this.cleanup();
      const pendingEntry = this.pending.get(transferId);
      return {
        payload: null,
        observation: pendingEntry
          ? observeEntry(transferId, pendingEntry, chunkIndex, duplicate, outOfOrder, false, false, data)
          : {
              transferId,
              chunkIndex,
              totalChunks,
              payloadBytes: data.length,
              duplicate,
              outOfOrder,
              invalid: false,
              complete: false,
              missing: [],
              receivedCount: 0,
              duplicateCount: duplicate ? 1 : 0,
              firstChunkAt: now,
              lastChunkAt: now,
              expired: false,
              messageId: sniffWhiteboardIdentity(data).messageId,
              sequence: sniffWhiteboardIdentity(data).sequence,
            },
      };
    }

    this.pending.delete(transferId);

    let totalLength = 0;
    for (const chunk of entry.chunks) {
      if (chunk) totalLength += chunk.length;
    }

    const out = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of entry.chunks) {
      if (chunk) {
        out.set(chunk, offset);
        offset += chunk.length;
      }
    }
    const identityBytes = entry.chunks[0] ?? data;
    return {
      payload: out,
      observation: observeEntry(transferId, entry, chunkIndex, duplicate, outOfOrder, true, false, identityBytes),
    };
  }

  takeExpired(now = Date.now()): ChunkObservation[] {
    this.cleanup(now);
    return this.expired.splice(0, this.expired.length);
  }

  private isChunkMagic(magic: number | undefined): boolean {
    return magic === MAGIC_CHUNK_START || magic === MAGIC_CHUNK_CONT || magic === MAGIC_CHUNK_END;
  }

  private cleanup(now = Date.now()) {
    for (const [id, entry] of this.pending) {
      if (now - entry.createdAt > 10_000) {
        this.expired.push(observeEntry(id, entry, 0, false, entry.outOfOrder, false, true, entry.chunks[0] ?? null));
        this.pending.delete(id);
        if (this.expired.length > 30) this.expired.shift();
      }
    }
  }
}
