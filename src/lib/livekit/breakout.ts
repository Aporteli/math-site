export const BREAKOUT_TOPIC = 'breakout';

export type BreakoutRoomKey = 'main' | 'a' | 'b';

export interface BreakoutAssignment {
  active: boolean;
  /** Account ids placed in Room A. */
  a: string[];
  /** Account ids placed in Room B. */
  b: string[];
}

export const IDLE_BREAKOUT: BreakoutAssignment = { active: false, a: [], b: [] };

const ROOM_KEYS = new Set<BreakoutRoomKey>(['main', 'a', 'b']);

export function isBreakoutRoomKey(value: string | null | undefined): value is BreakoutRoomKey {
  return value === 'main' || value === 'a' || value === 'b';
}

export function courseRoomName(courseId: string, key: BreakoutRoomKey = 'main'): string {
  if (key === 'main') return `course-${courseId}`;
  return `course-${courseId}--${key}`;
}

export function parseBreakoutMetadata(raw: string | undefined | null): BreakoutAssignment {
  if (!raw) return IDLE_BREAKOUT;
  try {
    const data = JSON.parse(raw) as { breakout?: Partial<BreakoutAssignment> };
    const breakout = data.breakout;
    if (!breakout || typeof breakout !== 'object') return IDLE_BREAKOUT;
    return {
      active: Boolean(breakout.active),
      a: stringList(breakout.a),
      b: stringList(breakout.b),
    };
  } catch {
    return IDLE_BREAKOUT;
  }
}

export function serializeBreakoutMetadata(assignment: BreakoutAssignment): string {
  return JSON.stringify({ breakout: assignment });
}

/** Room a student should be in. Teachers are never assigned by these lists. */
export function assignedRoom(assignment: BreakoutAssignment, userId: string): BreakoutRoomKey {
  if (!assignment.active) return 'main';
  if (assignment.a.includes(userId)) return 'a';
  if (assignment.b.includes(userId)) return 'b';
  return 'main';
}

export function roomKeyFromParam(value: string | null): BreakoutRoomKey | null {
  if (value && ROOM_KEYS.has(value as BreakoutRoomKey)) return value as BreakoutRoomKey;
  return null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}
