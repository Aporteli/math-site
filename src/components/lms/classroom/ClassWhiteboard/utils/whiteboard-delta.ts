import type { CanvasElement } from '../../KonvaCanvas/utils/types';

export interface WhiteboardDeltaBody {
  added: CanvasElement[];
  updated: CanvasElement[];
  deleted: string[];
}

function isElement(value: unknown): value is CanvasElement {
  if (!value || typeof value !== 'object') return false;
  const element = value as { id?: unknown; type?: unknown };
  return typeof element.id === 'string' && element.id.length > 0 && typeof element.type === 'string';
}

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

export function diffPageElements(previous: readonly CanvasElement[], next: readonly CanvasElement[]): WhiteboardDeltaBody {
  const previousById = new Map<string, CanvasElement>();
  for (const element of previous) previousById.set(element.id, element);

  const nextIds = new Set<string>();
  const added: CanvasElement[] = [];
  const updated: CanvasElement[] = [];
  for (const element of next) {
    if (nextIds.has(element.id)) continue;
    nextIds.add(element.id);
    const prior = previousById.get(element.id);
    if (!prior) added.push(element);
    else if (!sameValue(prior, element)) updated.push(element);
  }

  const deleted: string[] = [];
  for (const element of previous) {
    if (!nextIds.has(element.id)) deleted.push(element.id);
  }
  return { added, updated, deleted };
}

export function applyPageDelta(
  page: readonly CanvasElement[],
  delta: { added?: readonly unknown[]; updated?: readonly unknown[]; deleted?: readonly unknown[] },
): CanvasElement[] {
  const deleted = new Set(
    (delta.deleted ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0),
  );
  const updates = new Map<string, CanvasElement>();
  for (const element of delta.updated ?? []) {
    if (isElement(element)) updates.set(element.id, element);
  }

  const next: CanvasElement[] = [];
  const seen = new Set<string>();
  for (const element of page) {
    if (deleted.has(element.id) || seen.has(element.id)) continue;
    const replacement = updates.get(element.id);
    if (replacement) {
      next.push(replacement);
      updates.delete(element.id);
    } else {
      next.push(element);
    }
    seen.add(element.id);
  }

  for (const element of delta.added ?? []) {
    if (!isElement(element) || deleted.has(element.id)) continue;
    if (seen.has(element.id)) {
      const index = next.findIndex((item) => item.id === element.id);
      if (index >= 0) next[index] = element;
      continue;
    }
    next.push(element);
    seen.add(element.id);
  }

  for (const element of updates.values()) {
    if (seen.has(element.id) || deleted.has(element.id)) continue;
    next.push(element);
    seen.add(element.id);
  }

  return next;
}
