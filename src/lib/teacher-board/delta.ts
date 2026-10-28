export type BoardChange<T> = {
  pageIndex: number;
  added: T[];
  updated: T[];
  deleted: string[];
};

export type BoardDelta<T> = {
  pageCount: number;
  currentPageIndex: number;
  changes: BoardChange<T>[];
};

export type DeltaGuard = {
  revision: number;
  elementRevision: Map<string, number>;
  structureRevision: number;
};

function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (!sameValue(left[index], right[index])) return false;
    }
    return true;
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const a = left as Record<string, unknown>;
    const b = right as Record<string, unknown>;
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      if (!sameValue(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

export function diffPageElements<T extends { id: string }>(
  previous: readonly T[],
  next: readonly T[],
): { added: T[]; updated: T[]; deleted: string[] } {
  const previousById = new Map<string, T>();
  for (const element of previous) {
    if (element?.id) previousById.set(element.id, element);
  }

  const nextIds = new Set<string>();
  const added: T[] = [];
  const updated: T[] = [];
  for (const element of next) {
    if (!element?.id || nextIds.has(element.id)) continue;
    nextIds.add(element.id);
    const prior = previousById.get(element.id);
    if (!prior) added.push(element);
    else if (!sameValue(prior, element)) updated.push(element);
  }

  const deleted: string[] = [];
  for (const element of previous) {
    if (element?.id && !nextIds.has(element.id)) deleted.push(element.id);
  }
  return { added, updated, deleted };
}

export function diffBoard<T extends { id: string }>(
  previous: readonly (readonly T[])[],
  next: readonly (readonly T[])[],
): BoardChange<T>[] {
  const changes: BoardChange<T>[] = [];
  const count = Math.max(previous.length, next.length);
  for (let pageIndex = 0; pageIndex < count; pageIndex += 1) {
    const delta = diffPageElements(previous[pageIndex] ?? [], next[pageIndex] ?? []);
    if (delta.added.length === 0 && delta.updated.length === 0 && delta.deleted.length === 0) continue;
    changes.push({ pageIndex, added: delta.added, updated: delta.updated, deleted: delta.deleted });
  }
  return changes;
}

function allows(guard: DeltaGuard | undefined, id: string) {
  if (!guard) return true;
  const seen = guard.elementRevision.get(id) ?? 0;
  return guard.revision >= seen;
}

function mark(guard: DeltaGuard | undefined, id: string) {
  if (!guard) return;
  const seen = guard.elementRevision.get(id) ?? 0;
  if (guard.revision >= seen) guard.elementRevision.set(id, guard.revision);
}

function applyPageChange<T extends { id: string }>(
  page: readonly T[],
  change: { added?: readonly T[]; updated?: readonly T[]; deleted?: readonly string[] },
  guard?: DeltaGuard,
): T[] {
  const deleted = new Set<string>();
  for (const id of change.deleted ?? []) {
    if (typeof id !== 'string' || id.length === 0 || !allows(guard, id)) continue;
    deleted.add(id);
    mark(guard, id);
  }

  const updates = new Map<string, T>();
  for (const element of change.updated ?? []) {
    if (!element?.id || deleted.has(element.id) || !allows(guard, element.id)) continue;
    updates.set(element.id, element);
  }

  const next: T[] = [];
  const seen = new Set<string>();
  for (const element of page) {
    if (!element?.id || deleted.has(element.id) || seen.has(element.id)) continue;
    const replacement = updates.get(element.id);
    if (replacement) {
      next.push(replacement);
      updates.delete(element.id);
      mark(guard, element.id);
    } else {
      next.push(element);
    }
    seen.add(element.id);
  }

  for (const element of change.added ?? []) {
    if (!element?.id || deleted.has(element.id) || !allows(guard, element.id)) continue;
    if (seen.has(element.id)) {
      const index = next.findIndex((item) => item.id === element.id);
      if (index >= 0) next[index] = element;
    } else {
      next.push(element);
      seen.add(element.id);
    }
    mark(guard, element.id);
  }

  for (const element of updates.values()) {
    if (seen.has(element.id) || deleted.has(element.id)) continue;
    next.push(element);
    seen.add(element.id);
    mark(guard, element.id);
  }

  return next;
}

function keptPageCount<T extends { id: string }>(
  pages: readonly (readonly T[])[],
  requested: number,
  changes: readonly { pageIndex: number; deleted?: readonly string[] }[],
) {
  const stored = Math.max(1, pages.length);
  const want = Math.max(1, Math.floor(requested) || 1);
  if (want >= stored) return want;
  for (let index = want; index < pages.length; index += 1) {
    const ids: string[] = [];
    for (const element of pages[index] ?? []) {
      if (element?.id) ids.push(element.id);
    }
    if (ids.length === 0) continue;
    const deleted = new Set(
      (changes.find((change) => change.pageIndex === index)?.deleted ?? []).filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      ),
    );
    if (!ids.every((id) => deleted.has(id))) return stored;
  }
  return want;
}

export function applyBoardDelta<T extends { id: string }>(
  pages: readonly (readonly T[])[],
  delta: { pageCount: number; changes: readonly { pageIndex: number; added?: readonly T[]; updated?: readonly T[]; deleted?: readonly string[] }[] },
  guard?: DeltaGuard,
): T[][] {
  const applyStructure = !guard || guard.revision >= guard.structureRevision;
  const pageCount = applyStructure ? keptPageCount(pages, delta.pageCount, delta.changes) : Math.max(1, pages.length);
  const next: T[][] = [];
  for (let index = 0; index < pageCount; index += 1) {
    next.push(pages[index] ? pages[index].slice() : []);
  }

  for (const change of delta.changes) {
    if (!change || !Number.isInteger(change.pageIndex)) continue;
    if (change.pageIndex < 0 || change.pageIndex >= next.length) continue;
    next[change.pageIndex] = applyPageChange(next[change.pageIndex], change, guard);
  }

  if (guard && applyStructure) guard.structureRevision = guard.revision;
  return next;
}
