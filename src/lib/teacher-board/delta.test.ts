import assert from 'node:assert/strict';
import { applyBoardDelta, diffBoard, type DeltaGuard } from './delta';

type Element = { id: string; type: string; stroke: string; strokeWidth: number; points?: number[]; src?: string };

function stroke(id: string): Element {
  return { id, type: 'freedraw', stroke: '#111111', strokeWidth: 2, points: [1, 2, 3, 4] };
}

function image(id: string): Element {
  return { id, type: 'image', stroke: 'transparent', strokeWidth: 0, src: `data:image/png;base64,${id}` };
}

const imageEl = image('img-1');
const base = [[imageEl, stroke('el-old')]];
const drawn = stroke('el-new');
const next = [[imageEl, stroke('el-old'), drawn]];
const changes = diffBoard(base, next);

assert.deepEqual(changes.map((change) => change.added.map((element) => element.id)), [['el-new']]);
assert.equal(changes[0].updated.length, 0);
assert.equal(changes[0].deleted.length, 0);
assert.ok(!JSON.stringify(changes).includes('data:image'));

const merged = applyBoardDelta(base, { pageCount: 1, changes });
assert.deepEqual(
  merged[0].map((element) => element.id),
  ['img-1', 'el-old', 'el-new'],
);
assert.equal(merged[0][0].src, imageEl.src);

const again = applyBoardDelta(merged, { pageCount: 1, changes });
assert.deepEqual(
  again[0].map((element) => element.id),
  ['img-1', 'el-old', 'el-new'],
);

const other = stroke('el-remote');
const concurrent = applyBoardDelta(merged, {
  pageCount: 1,
  changes: [{ pageIndex: 0, added: [other], updated: [], deleted: [] }],
});
assert.deepEqual(
  concurrent[0].map((element) => element.id),
  ['img-1', 'el-old', 'el-new', 'el-remote'],
);

const guard: DeltaGuard = { revision: 20, elementRevision: new Map([['el-new', 20]]), structureRevision: 20 };
const stale = applyBoardDelta(
  concurrent,
  {
    pageCount: 1,
    changes: [{ pageIndex: 0, added: [], updated: [{ ...drawn, stroke: '#ff0000' }], deleted: [] }],
  },
  { ...guard, revision: 10 },
);
assert.equal(stale[0].find((element) => element.id === 'el-new')?.stroke, '#111111');
assert.equal(stale[0].find((element) => element.id === 'img-1')?.src, imageEl.src);

const freshGuard: DeltaGuard = { revision: 30, elementRevision: guard.elementRevision, structureRevision: 20 };
const fresh = applyBoardDelta(
  stale,
  {
    pageCount: 1,
    changes: [{ pageIndex: 0, added: [], updated: [{ ...drawn, stroke: '#00ff00' }], deleted: [] }],
  },
  freshGuard,
);
assert.equal(fresh[0].find((element) => element.id === 'el-new')?.stroke, '#00ff00');
assert.equal(fresh[0].find((element) => element.id === 'img-1')?.src, imageEl.src);

const withSecondPage = [[imageEl, stroke('el-old')], [image('img-2')]];
const shortClient = applyBoardDelta(withSecondPage, {
  pageCount: 1,
  changes: [{ pageIndex: 0, added: [drawn], updated: [], deleted: [] }],
});
assert.equal(shortClient.length, 2);
assert.equal(shortClient[1][0].src, 'data:image/png;base64,img-2');
assert.deepEqual(
  shortClient[0].map((element) => element.id),
  ['img-1', 'el-old', 'el-new'],
);

const removed = diffBoard(next, base);
const afterDelete = applyBoardDelta(next, { pageCount: 1, changes: removed });
assert.deepEqual(
  afterDelete[0].map((element) => element.id),
  ['img-1', 'el-old'],
);

// ── Concurrent edits: two browsers both add a stroke, neither overwrites the other ──
// Simulates the fast-path dispatch in the server: each browser reads the
// latest in-memory state (atomically updated per-dispatch) and applies its own
// delta.  The second browser already sees the first browser's stroke in the
// in-memory baseline.
const concBase = [[imageEl, stroke('el-a')]];
// Browser A adds el-b
const afterA = applyBoardDelta(concBase, {
  pageCount: 1,
  changes: [{ pageIndex: 0, added: [stroke('el-b')], updated: [], deleted: [] }],
});
assert.deepEqual(afterA[0].map((e) => e.id), ['img-1', 'el-a', 'el-b']);
// Browser B reads the updated state (afterA) and adds el-c
const afterAB = applyBoardDelta(afterA, {
  pageCount: 1,
  changes: [{ pageIndex: 0, added: [stroke('el-c')], updated: [], deleted: [] }],
});
assert.deepEqual(afterAB[0].map((e) => e.id), ['img-1', 'el-a', 'el-b', 'el-c']);
// If B had read the stale base (race), it would produce el-c without el-b.
// With the fast-path (in-memory), it always reads the post-A state. Verify
// that replaying both deltas in order on the stale base also converges.
const replayA = applyBoardDelta(concBase, {
  pageCount: 1,
  changes: [{ pageIndex: 0, added: [stroke('el-b')], updated: [], deleted: [] }],
});
const replayAB = applyBoardDelta(replayA, {
  pageCount: 1,
  changes: [{ pageIndex: 0, added: [stroke('el-c')], updated: [], deleted: [] }],
});
assert.deepEqual(replayAB[0].map((e) => e.id), afterAB[0].map((e) => e.id));

// ── Undo/redo correctness: undoing A's stroke must not delete B's remote stroke ──
// History state before A's stroke: [img-1]
// History state after A's stroke:  [img-1, el-a]  (current when remote arrives)
// Remote (B) adds el-remote.  applyRemoteDelta patches both history states.
const historyStateOld = [imageEl];
const historyStateCurrent = [imageEl, stroke('el-a')];
// Remote delta: add el-remote
const remoteDelta = { pageIndex: 0, added: [stroke('el-remote')], updated: [], deleted: [] };
const updatedOld = applyBoardDelta([historyStateOld], {
  pageCount: 1,
  changes: [remoteDelta],
})[0];
const updatedCurrent = applyBoardDelta([historyStateCurrent], {
  pageCount: 1,
  changes: [remoteDelta],
})[0];
// After patching, both history states include el-remote
assert.deepEqual(updatedOld.map((e) => e.id), ['img-1', 'el-remote']);
assert.deepEqual(updatedCurrent.map((e) => e.id), ['img-1', 'el-a', 'el-remote']);
// Undo restores the old state (now [img-1, el-remote])
// buildDelta(synced=[img-1, el-a, el-remote], pages=[img-1, el-remote])
//   → deleted = [el-a]  (NOT el-remote)
const syncedAfterRemote = updatedCurrent;
const afterUndoPages = updatedOld;
const undoDiff = diffBoard([syncedAfterRemote], [afterUndoPages]);
assert.deepEqual(undoDiff[0].deleted, ['el-a'], 'undo should only delete el-a, not el-remote');
assert.equal(undoDiff[0].added.length, 0);
assert.equal(undoDiff[0].updated.length, 0);

// ── Duplicate delivery: applying the same delta twice is idempotent ──
const dupBase = [[imageEl, stroke('s1')]];
const dupDelta = { pageCount: 1, changes: [{ pageIndex: 0, added: [stroke('s2')], updated: [], deleted: [] }] };
const once = applyBoardDelta(dupBase, dupDelta);
const twice = applyBoardDelta(once, dupDelta);
assert.deepEqual(once[0].map((e) => e.id), ['img-1', 's1', 's2']);
assert.deepEqual(twice[0].map((e) => e.id), ['img-1', 's1', 's2'], 'duplicate delta must not add s2 twice');

// ── Out-of-order delivery: guard prevents stale update from overwriting newer ──
const oooBase = [[stroke('s1')]];
// R=10: add s1, mark elementRevision s1=10
const guard10: DeltaGuard = { revision: 10, elementRevision: new Map([['s1', 10]]), structureRevision: 10 };
// R=20: update s1 with a fresh guard
const afterR20 = applyBoardDelta(oooBase, {
  pageCount: 1,
  changes: [{ pageIndex: 0, added: [], updated: [{ ...stroke('s1'), stroke: '#aabbcc' }], deleted: [] }],
}, { revision: 20, elementRevision: guard10.elementRevision, structureRevision: 10 });
assert.equal(afterR20[0][0].stroke, '#aabbcc');
// R=10 (stale) arrives later: guard blocks it
const afterStale = applyBoardDelta(afterR20, {
  pageCount: 1,
  changes: [{ pageIndex: 0, added: [], updated: [{ ...stroke('s1'), stroke: '#000000' }], deleted: [] }],
}, { revision: 10, elementRevision: guard10.elementRevision, structureRevision: 10 });
assert.equal(afterStale[0][0].stroke, '#aabbcc', 'stale R=10 must not overwrite R=20 update');

// ── Page preservation: delta with fewer pages must not delete populated pages ──
const multiPage = [[imageEl], [stroke('page2-el')]];
const smallPageCount = applyBoardDelta(multiPage, {
  pageCount: 1,
  changes: [{ pageIndex: 0, added: [stroke('p0-new')], updated: [], deleted: [] }],
});
assert.equal(smallPageCount.length, 2, 'page 2 must be preserved when delta pageCount < stored pageCount');
assert.equal(smallPageCount[1][0].id, 'page2-el');

console.log('teacher board delta tests passed');
