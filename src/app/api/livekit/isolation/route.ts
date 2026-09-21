import { NextRequest, NextResponse } from 'next/server';
import { RoomServiceClient, TrackType } from 'livekit-server-sdk';
import type { ParticipantInfo } from 'livekit-server-sdk';
import { getSession } from '@/lib/auth/session';
import { participantUserId } from '@/lib/livekit/participant-identity';
import { prisma } from '@/lib/prisma';

interface IsolationRequestBody {
  courseId?: string;
  isolatedIdentities?: string[];
}

export async function POST(req: NextRequest) {
  try {
    let body: IsolationRequestBody;
    try {
      body = (await req.json()) as IsolationRequestBody;
    } catch {
      return new NextResponse('Invalid JSON body', { status: 400 });
    }

    const { courseId, isolatedIdentities } = body;

    if (typeof courseId !== 'string' || !courseId) {
      return new NextResponse('courseId is required', { status: 400 });
    }
    if (!Array.isArray(isolatedIdentities) || !isolatedIdentities.every((id) => typeof id === 'string')) {
      return new NextResponse('isolatedIdentities must be an array of strings', { status: 400 });
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

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return new NextResponse('LiveKit config is missing', { status: 500 });
    }

    const httpUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    const roomName = `course-${courseId}`;

    const participants = await roomService.listParticipants(roomName);

    // Isolation is keyed by live connection identity: the teacher may be
    // connected from several devices, and none of them may ever be isolated.
    const teacherIdentities = new Set(
      participants
        .filter((p) => participantUserId(p) === course.teacherId)
        .map((p) => p.identity),
    );

    // Never treat the teacher as isolated, and dedupe the requested set.
    const isolatedSet = new Set(
      isolatedIdentities.filter((id) => !teacherIdentities.has(id)),
    );

    const nonTeacherParticipants = participants.filter((p) => !teacherIdentities.has(p.identity));

    const audioTrackSids = (participant: ParticipantInfo) =>
      participant.tracks
        .filter((track) => track.type === TrackType.AUDIO)
        .map((track) => track.sid);

    const failures: string[] = [];

    const applySubscriptions = async (
      identity: string,
      trackSids: string[],
      subscribe: boolean,
    ) => {
      if (trackSids.length === 0) return;
      try {
        await roomService.updateSubscriptions(roomName, identity, trackSids, subscribe);
      } catch (error) {
        failures.push(identity);
        console.error(`Failed to update subscriptions for ${identity}:`, error);
      }
    };

    // Recompute every non-teacher participant's audio subscriptions from the
    // full isolated set. `updateSubscriptions` only touches the supplied track
    // sids, so publishing is never affected and idempotent updates are safe.
    for (const p of nonTeacherParticipants) {
      const pIsolated = isolatedSet.has(p.identity);

      for (const q of participants) {
        if (q.identity === p.identity) continue;

        const qAudioSids = audioTrackSids(q);
        const shouldHear = !pIsolated && !isolatedSet.has(q.identity);
        await applySubscriptions(p.identity, qAudioSids, shouldHear);
      }
    }

    return NextResponse.json({
      ok: failures.length === 0,
      isolatedIdentities: Array.from(isolatedSet),
      affectedParticipants: nonTeacherParticipants.length,
      failures,
    });
  } catch (error) {
    console.error('Audio isolation error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
