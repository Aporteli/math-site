import { NextRequest, NextResponse } from 'next/server';
import { RoomServiceClient, TrackType } from 'livekit-server-sdk';
import type { ParticipantInfo } from 'livekit-server-sdk';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

interface IsolationRequestBody {
  courseId?: string;
  studentIdentity?: string;
  isolate?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    let body: IsolationRequestBody;
    try {
      body = (await req.json()) as IsolationRequestBody;
    } catch {
      return new NextResponse('Invalid JSON body', { status: 400 });
    }

    const { courseId, studentIdentity, isolate } = body;

    if (typeof courseId !== 'string' || !courseId) {
      return new NextResponse('courseId is required', { status: 400 });
    }
    if (typeof studentIdentity !== 'string' || !studentIdentity) {
      return new NextResponse('studentIdentity is required', { status: 400 });
    }
    if (typeof isolate !== 'boolean') {
      return new NextResponse('isolate (boolean) is required', { status: 400 });
    }
    const session = await getSession();
    const userId = session?.user?.id;
    const userRole = (session?.user as any)?.role;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });

    if (!course) {
      return new NextResponse('Course not found', { status: 404 });
    }

    const isTeacher = course.teacherId === userId || userRole === 'ADMIN';
    if (!isTeacher) {
      return new NextResponse('Only the teacher can manage audio isolation', {
        status: 403,
      });
    }

    if (studentIdentity === course.teacherId) {
      return new NextResponse('The teacher cannot be isolated', { status: 400 });
    }
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return new NextResponse('LiveKit config is missing', { status: 500 });
    }

    const httpUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    const roomName = `course-${courseId}`;

    // 3. Resolve current room state
    const participants = await roomService.listParticipants(roomName);

    const target = participants.find((p) => p.identity === studentIdentity);
    if (!target) {
      return new NextResponse('Target student is not in the room', { status: 404 });
    }

    const otherParticipants = participants.filter((p) => p.identity !== studentIdentity);
    const otherStudents = otherParticipants.filter((p) => p.identity !== course.teacherId);

    const audioTrackSids = (participant: ParticipantInfo) =>
      participant.tracks
        .filter((track) => track.type === TrackType.AUDIO)
        .map((track) => track.sid);

    const otherAudioSids = otherParticipants.flatMap(audioTrackSids);
    const targetAudioSids = audioTrackSids(target);
    const failures: string[] = [];

    const applySubscriptions = async (identity: string, trackSids: string[]) => {
      if (trackSids.length === 0) return;
      try {
        await roomService.updateSubscriptions(roomName, identity, trackSids, !isolate);
      } catch (error) {
        failures.push(identity);
        console.error(`Failed to update subscriptions for ${identity}:`, error);
      }
    };
    await applySubscriptions(studentIdentity, otherAudioSids);
    for (const student of otherStudents) {
      await applySubscriptions(student.identity, targetAudioSids);
    }

    return NextResponse.json({
      ok: failures.length === 0,
      isolated: isolate,
      studentIdentity,
      room: roomName,
      affectedParticipants: otherStudents.length + 1,
      failures,
    });
  } catch (error) {
    console.error('Audio isolation error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
