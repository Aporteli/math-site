import { NextRequest, NextResponse } from 'next/server';
import { DataPacket_Kind, type RoomServiceClient } from 'livekit-server-sdk';
import { loadCourseAccess } from '@/lib/livekit/course-access';
import {
  BREAKOUT_TOPIC,
  IDLE_BREAKOUT,
  courseRoomName,
  parseBreakoutMetadata,
  serializeBreakoutMetadata,
  type BreakoutAssignment,
  type BreakoutRoomKey,
} from '@/lib/livekit/breakout';
import { ensureLiveKitRoom } from '@/lib/livekit/issue-token';
import { getLiveKitEnv } from '@/lib/livekit/livekit-env';
import { prisma } from '@/lib/prisma';

const MAIN_EMPTY_TIMEOUT = 60 * 60 * 24;
const BREAKOUT_EMPTY_TIMEOUT = 60 * 10;

export async function GET(req: NextRequest) {
  const courseId = new URL(req.url).searchParams.get('courseId');
  if (!courseId) return new NextResponse('Missing courseId', { status: 400 });

  const loaded = await loadCourseAccess(courseId);
  if (!loaded.ok) return new NextResponse(loaded.message, { status: loaded.status });

  const env = getLiveKitEnv();
  if (!env) return new NextResponse('LiveKit config is missing', { status: 500 });

  const assignment = await readAssignment(env.roomService, courseId);
  const selfRoom = loaded.access.isTeacher ? 'main' : assignedFor(assignment, loaded.access.userId);

  if (!loaded.access.isTeacher) {
    return NextResponse.json({
      active: assignment.active,
      a: [],
      b: [],
      selfRoom,
    });
  }

  return NextResponse.json({
    active: assignment.active,
    a: assignment.a,
    b: assignment.b,
    selfRoom,
  });
}

export async function POST(req: NextRequest) {
  let body: { courseId?: unknown; action?: unknown; a?: unknown; b?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new NextResponse('Invalid JSON body', { status: 400 });
  }

  if (typeof body.courseId !== 'string' || !body.courseId) {
    return new NextResponse('courseId is required', { status: 400 });
  }

  const loaded = await loadCourseAccess(body.courseId);
  if (!loaded.ok) return new NextResponse(loaded.message, { status: loaded.status });
  if (!loaded.access.isTeacher) {
    return new NextResponse('Only the teacher can manage breakout rooms', { status: 403 });
  }

  const env = getLiveKitEnv();
  if (!env) return new NextResponse('LiveKit config is missing', { status: 500 });

  if (body.action === 'merge') {
    await writeAssignment(env.roomService, body.courseId, IDLE_BREAKOUT);
    await signalRooms(env.roomService, body.courseId);
    return NextResponse.json(IDLE_BREAKOUT);
  }

  if (body.action !== 'split') {
    return new NextResponse('action must be split or merge', { status: 400 });
  }

  const groupA = cleanIds(body.a);
  const groupB = cleanIds(body.b);
  if (!groupA || !groupB) {
    return new NextResponse('a and b must be arrays of student ids', { status: 400 });
  }

  const overlap = groupA.filter((id) => groupB.includes(id));
  if (overlap.length > 0) {
    return new NextResponse('A student can only be in one room', { status: 400 });
  }

  const ids = [...groupA, ...groupB];
  if (ids.length === 0) {
    return new NextResponse('Assign at least one student', { status: 400 });
  }
  if (ids.includes(loaded.access.teacherId) || ids.includes(loaded.access.userId)) {
    return new NextResponse('The teacher stays outside the student groups', { status: 400 });
  }

  const enrolled = await prisma.enrollment.findMany({
    where: { courseId: body.courseId, status: 'ACTIVE', userId: { in: ids } },
    select: { userId: true },
  });
  if (enrolled.length !== ids.length) {
    return new NextResponse('Every assigned student must be enrolled in this course', { status: 400 });
  }

  const assignment: BreakoutAssignment = { active: true, a: groupA, b: groupB };
  await writeAssignment(env.roomService, body.courseId, assignment);
  await signalRooms(env.roomService, body.courseId);
  return NextResponse.json(assignment);
}

function assignedFor(assignment: BreakoutAssignment, userId: string): BreakoutRoomKey {
  if (!assignment.active) return 'main';
  if (assignment.a.includes(userId)) return 'a';
  if (assignment.b.includes(userId)) return 'b';
  return 'main';
}

function cleanIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || item.length < 1 || item.length > 64) return null;
    if (!ids.includes(item)) ids.push(item);
  }
  return ids;
}

async function readAssignment(
  roomService: RoomServiceClient,
  courseId: string,
): Promise<BreakoutAssignment> {
  try {
    const rooms = await roomService.listRooms([courseRoomName(courseId, 'main')]);
    return parseBreakoutMetadata(rooms[0]?.metadata);
  } catch {
    return IDLE_BREAKOUT;
  }
}

async function writeAssignment(
  roomService: RoomServiceClient,
  courseId: string,
  assignment: BreakoutAssignment,
) {
  const main = courseRoomName(courseId, 'main');
  await ensureLiveKitRoom(roomService, main, MAIN_EMPTY_TIMEOUT);
  if (assignment.active) {
    await ensureLiveKitRoom(roomService, courseRoomName(courseId, 'a'), BREAKOUT_EMPTY_TIMEOUT);
    await ensureLiveKitRoom(roomService, courseRoomName(courseId, 'b'), BREAKOUT_EMPTY_TIMEOUT);
  }
  await roomService.updateRoomMetadata(main, serializeBreakoutMetadata(assignment));
}

async function signalRooms(roomService: RoomServiceClient, courseId: string) {
  const payload = new TextEncoder().encode(JSON.stringify({ type: 'BREAKOUT_SYNC' }));
  const rooms: BreakoutRoomKey[] = ['main', 'a', 'b'];
  await Promise.all(
    rooms.map(async (key) => {
      try {
        await roomService.sendData(courseRoomName(courseId, key), payload, DataPacket_Kind.RELIABLE, {
          topic: BREAKOUT_TOPIC,
        });
      } catch (error) {
        console.error('Breakout signal failed:', key, error);
      }
    }),
  );
}
