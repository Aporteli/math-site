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

console.log('teacher board delta tests passed');
