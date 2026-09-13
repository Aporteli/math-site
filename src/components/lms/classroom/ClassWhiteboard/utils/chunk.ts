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

export function chunkPayload(bytes: Uint8Array): Uint8Array[] {
  if (bytes.length <= CHUNK_PAYLOAD_BYTES) return [bytes];

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

  return chunks;
}

export class ChunkAssembler {
  private pending = new Map<
    number,
    { totalChunks: number; chunks: (Uint8Array | null)[]; received: number; createdAt: number }
  >();

  push(bytes: Uint8Array): Uint8Array | null {
    if (bytes.length < CHUNK_HEADER_BYTES) return bytes;
    const magic = bytes[0];
    if (magic !== MAGIC_CHUNK_START && magic !== MAGIC_CHUNK_CONT && magic !== MAGIC_CHUNK_END) {
      return bytes;
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const transferId = view.getUint32(1, false);
    const chunkIndex = view.getUint32(5, false);
    const totalChunks = view.getUint32(9, false);
    const data = bytes.subarray(CHUNK_HEADER_BYTES);

    if (magic === MAGIC_CHUNK_START) {
      const entry = {
        totalChunks,
        chunks: new Array<Uint8Array | null>(totalChunks).fill(null),
        received: 0,
        createdAt: Date.now(),
      };
      if (chunkIndex < totalChunks) {
        entry.chunks[chunkIndex] = data;
        entry.received += 1;
      }
      this.pending.set(transferId, entry);
    } else {
      const entry = this.pending.get(transferId);
      if (!entry) return null;
      if (chunkIndex < entry.totalChunks && !entry.chunks[chunkIndex]) {
        entry.chunks[chunkIndex] = data;
        entry.received += 1;
      }
      // Keep the transfer alive while chunks are still flowing. Otherwise a
      // large (many-chunk) full sync can take longer than the absolute
      // 10s window below and get torn down mid-transfer.
      entry.createdAt = Date.now();
    }

    const entry = this.pending.get(transferId);
    if (!entry || entry.received < entry.totalChunks) {
      this.cleanup();
      return null;
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
    return out;
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, entry] of this.pending) {
      if (now - entry.createdAt > 10_000) this.pending.delete(id);
    }
  }
}
