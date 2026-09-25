// lib/actions/room.ts
'use server';

import { RoomServiceClient } from 'livekit-server-sdk';
import { getSession } from '@/lib/auth/session';
import { courseRoomName, type BreakoutRoomKey } from '@/lib/livekit/breakout';
import { participantUserId } from '@/lib/livekit/participant-identity';
import { prisma } from '@/lib/prisma';

const CLASS_ROOMS: BreakoutRoomKey[] = ['main', 'a', 'b'];

export async function checkTeacherInRoom(courseId: string): Promise<boolean> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { teacherId: true },
  });

  if (!course) {
    throw new Error('Course not found');
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    throw new Error('LiveKit config missing');
  }

  const httpUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
  const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);

  for (const key of CLASS_ROOMS) {
    try {
      const participants = await roomService.listParticipants(courseRoomName(courseId, key));
      if (participants.some((participant) => participantUserId(participant) === course.teacherId)) {
        return true;
      }
    } catch {
      // That room is not open.
    }
  }

  return false;
}

export async function getCourseTeacherId(courseId: string): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { teacherId: true },
  });

  if (!course) {
    throw new Error('Course not found');
  }

  return course.teacherId;
}