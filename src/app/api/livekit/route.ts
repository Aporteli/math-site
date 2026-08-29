import { NextRequest, NextResponse } from 'next/server';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return new NextResponse('Missing courseId', { status: 400 });
    }

    // 1. სესიის შემოწმება — დაულოგინებელი მომხმარებლის დაბლოკვა (401)
    const session = await getSession();
    const userId = session?.user?.id;
    const userName = session?.user?.name || 'მომხმარებელი';
    const userRole = (session?.user as any)?.role;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. კურსის და უფლებების შემოწმება
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });

    if (!course) {
      return new NextResponse('Course not found', { status: 404 });
    }

    const isTeacher = course.teacherId === userId || userRole === 'ADMIN';

    if (!isTeacher) {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          courseId: courseId,
          userId: userId,
          status: 'ACTIVE',
        },
      });

      if (!enrollment) {
        return new NextResponse('Access denied for this course', { status: 403 });
      }
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return new NextResponse('LiveKit config is missing', { status: 500 });
    }

    const roomName = `course-${courseId}`;

    // 3. ოთახის დარეგისტრირება მუდმივი სტატუსით (არ დაიხურება 24 საათის განმავლობაში)
    try {
      const httpUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
      const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);

      await roomService.createRoom({
        name: roomName,
        emptyTimeout: 60 * 60 * 24, // 24 საათი ცარიელიც რომ იყოს, ოთახი არ წაიშლება
        maxParticipants: 50,
      });
    } catch {
      // თუ ოთახი უკვე შექმნილია, შეცდომას ვაიგნორებთ და ჩვეულებრივ ვაგრძელებთ
    }

    // 4. ტოკენის გენერაცია
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: userName,
      ttl: '12h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token, room: roomName });
  } catch (error) {
    console.error('LiveKit token error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
