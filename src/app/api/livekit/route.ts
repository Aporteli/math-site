import { NextRequest, NextResponse } from 'next/server';
import { type RoomServiceClient } from 'livekit-server-sdk';
import { loadCourseAccess } from '@/lib/livekit/course-access';
import {
  IDLE_BREAKOUT,
  assignedRoom,
  courseRoomName,
  parseBreakoutMetadata,
  roomKeyFromParam,
  type BreakoutAssignment,
  type BreakoutRoomKey,
} from '@/lib/livekit/breakout';
import { ensureLiveKitRoom, hasRealAccountConnection, issueRoomToken } from '@/lib/livekit/issue-token';
import { getLiveKitEnv } from '@/lib/livekit/livekit-env';

const MAIN_EMPTY_TIMEOUT = 60 * 60 * 24;
const BREAKOUT_EMPTY_TIMEOUT = 60 * 10;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    if (!courseId) return new NextResponse('Missing courseId', { status: 400 });

    const loaded = await loadCourseAccess(courseId);
    if (!loaded.ok) return new NextResponse(loaded.message, { status: loaded.status });

    const env = getLiveKitEnv();
    if (!env) return new NextResponse('LiveKit config is missing', { status: 500 });

    const assignment = await readAssignment(env.roomService, courseId);
    const intent = searchParams.get('intent') === 'monitor' ? 'monitor' : 'media';
    const requestedRoom = roomKeyFromParam(searchParams.get('roomKey'));

    if (intent === 'monitor') {
      if (!loaded.access.isTeacher) {
        return new NextResponse('Only the teacher can monitor a room', { status: 403 });
      }
      if (!assignment.active || !requestedRoom) {
        return new NextResponse('Nothing to monitor', { status: 409 });
      }
      const roomName = courseRoomName(courseId, requestedRoom);
      await ensureLiveKitRoom(
        env.roomService,
        roomName,
        requestedRoom === 'main' ? MAIN_EMPTY_TIMEOUT : BREAKOUT_EMPTY_TIMEOUT,
      );
      const token = await issueRoomToken({
        apiKey: env.apiKey,
        apiSecret: env.apiSecret,
        userId: loaded.access.userId,
        userName: loaded.access.userName,
        role: 'monitor',
        roomName,
        canPublish: false,
        canSubscribe: true,
        canPublishData: false,
        hidden: true,
      });
      return NextResponse.json({ token, room: roomName, roomKey: requestedRoom });
    }

    const roomKey = mediaRoomKey(assignment, loaded.access.isTeacher, loaded.access.userId, requestedRoom);
    const roomName = courseRoomName(courseId, roomKey);
    await ensureLiveKitRoom(
      env.roomService,
      roomName,
      roomKey === 'main' ? MAIN_EMPTY_TIMEOUT : BREAKOUT_EMPTY_TIMEOUT,
    );

    const secondary = await hasRealAccountConnection(env.roomService, roomName, loaded.access.userId);
    const role = loaded.access.userRole.toLowerCase();
    const token = await issueRoomToken({
      apiKey: env.apiKey,
      apiSecret: env.apiSecret,
      userId: loaded.access.userId,
      userName: loaded.access.userName,
      role,
      roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    let boardToken: string | null = null;
    if (roomKey !== 'main') {
      const mainRoom = courseRoomName(courseId, 'main');
      await ensureLiveKitRoom(env.roomService, mainRoom, MAIN_EMPTY_TIMEOUT);
      boardToken = await issueRoomToken({
        apiKey: env.apiKey,
        apiSecret: env.apiSecret,
        userId: loaded.access.userId,
        userName: loaded.access.userName,
        role: 'board',
        roomName: mainRoom,
        canPublish: false,
        canSubscribe: true,
        canPublishData: true,
      });
    }

    return NextResponse.json({
      token,
      room: roomName,
      roomKey,
      secondary,
      breakout: assignment,
      boardToken,
    });
  } catch (error) {
    console.error('LiveKit token error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

function mediaRoomKey(
  assignment: BreakoutAssignment,
  isTeacher: boolean,
  userId: string,
  requested: BreakoutRoomKey | null,
): BreakoutRoomKey {
  if (!assignment.active) return 'main';
  if (isTeacher) return requested ?? 'main';
  return assignedRoom(assignment, userId);
}

async function readAssignment(roomService: RoomServiceClient, courseId: string): Promise<BreakoutAssignment> {
  try {
    const rooms = await roomService.listRooms([courseRoomName(courseId, 'main')]);
    return parseBreakoutMetadata(rooms[0]?.metadata);
  } catch {
    return IDLE_BREAKOUT;
  }
}
