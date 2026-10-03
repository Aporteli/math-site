import assert from 'node:assert/strict';
import type { CanvasElement } from '../../KonvaCanvas/utils/types';
import { chunkPayloadDetailed } from './chunk';
import { applyPageDelta, diffPageElements } from './whiteboard-delta';
import { beginWhiteboardFullSync, invalidateWhiteboardFullSync } from '../../../../../lib/livekit/board-assignment';

function stroke(id: string, pointCount: number): CanvasElement {
  const points: number[] = [];
  for (let index = 0; index < pointCount; index += 1) points.push(index, index + 1);
  return { id, type: 'freedraw', points, stroke: '#111111', strokeWidth: 2 };
}

function deltaBytes(previous: CanvasElement[], next: CanvasElement[]): number {
  const delta = diffPageElements(previous, next);
  return new TextEncoder().encode(
    JSON.stringify({
      type: 'WHITEBOARD_DELTA',
      pageIndex: 0,
      ...(delta.added.length > 0 ? { added: delta.added } : {}),
      ...(delta.updated.length > 0 ? { updated: delta.updated } : {}),
      ...(delta.deleted.length > 0 ? { deleted: delta.deleted } : {}),
    }),
  ).length;
}

const existing = Array.from({ length: 40 }, (_, index) => stroke(`stroke-${index}`, 180));
const drawn = stroke('stroke-new', 24);
const withStroke = [...existing, drawn];
const added = diffPageElements(existing, withStroke);
assert.deepEqual(added.added.map((element) => element.id), ['stroke-new']);
assert.equal(added.updated.length, 0);
assert.equal(added.deleted.length, 0);
assert.deepEqual(applyPageDelta(existing, added).map((element) => element.id), withStroke.map((element) => element.id));

const moved = { ...drawn, x: 12, y: 8 };
const updated = diffPageElements(withStroke, [...existing, moved]);
assert.deepEqual(updated.updated.map((element) => element.id), ['stroke-new']);
assert.equal(updated.added.length, 0);
assert.deepEqual(applyPageDelta(withStroke, updated).at(-1), moved);

const undone = diffPageElements(withStroke, existing);
assert.deepEqual(undone.deleted, ['stroke-new']);
assert.deepEqual(applyPageDelta(withStroke, undone), existing);
const redone = diffPageElements(existing, withStroke);
assert.deepEqual(applyPageDelta(existing, redone).at(-1)?.id, 'stroke-new');

const fullBytes = new TextEncoder().encode(JSON.stringify({ type: 'WHITEBOARD_SYNC', pageIndex: 0, elements: withStroke })).length;
const smallBytes = deltaBytes(existing, withStroke);
assert.ok(fullBytes > 50_000, `expected a large page snapshot, got ${fullBytes}`);
assert.ok(smallBytes < 4_000, `expected a small stroke delta, got ${smallBytes}`);
assert.equal(chunkPayloadDetailed(new TextEncoder().encode(JSON.stringify({ type: 'WHITEBOARD_DELTA', added: [drawn] }))).chunks.length, 1);
assert.ok(chunkPayloadDetailed(new TextEncoder().encode(JSON.stringify({ type: 'WHITEBOARD_SYNC', elements: withStroke }))).chunks.length > 1);

const first = beginWhiteboardFullSync(['student-a', 'student-b'], 'shared');
assert.ok(first);
assert.equal(beginWhiteboardFullSync(['student-a'], 'shared'), null);
const otherKind = beginWhiteboardFullSync(['student-a'], 'assigned:1');
assert.ok(otherKind);
otherKind.release();
invalidateWhiteboardFullSync();
const afterStructureChange = beginWhiteboardFullSync(['student-a'], 'shared');
assert.ok(afterStructureChange);
afterStructureChange.release();
first.release();

console.log('whiteboard delta tests passed');
