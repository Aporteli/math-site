import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return new NextResponse('Missing courseId', { status: 400 });
    }

    const session = await getSession();
    let userId = session?.user?.id;
    let userName = session?.user?.name || 'მომხმარებელი';

    // 1. თუ მომხმარებელი ავტორიზებულია — ვამოწმებთ რეალურ უფლებებს
    if (userId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true },
      });

      if (!course) {
        return new NextResponse('Course not found', { status: 404 });
      }

      let hasAccess = false;

      if (course.teacherId === userId) {
        hasAccess = true;
      } else {
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            courseId: courseId,
            userId: userId,
            status: 'ACTIVE',
          },
        });
        if (enrollment) {
          hasAccess = true;
        }
      }

      // თუ ავტორიზებულია, მაგრამ ამ კურსზე წვდომა არ აქვს (სურვილისამებრ ტესტისთვის შეგიძლიათ დატოვოთ true)
      if (!hasAccess) {
        return new NextResponse('Access denied for this course', { status: 403 });
      }
    } else {
      // 2. თუ ავტორიზებული არაა (ვიზიტორია მეორე კომპიუტერიდან სატესტოდ)
      const randomGuestId = Math.random().toString(36).substring(2, 6);
      userId = `guest-${randomGuestId}`;
      userName = `სტუმარი-${randomGuestId}`;
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return new NextResponse('LiveKit API keys are missing', { status: 500 });
    }

    const roomName = `course-${courseId}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: userName,
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