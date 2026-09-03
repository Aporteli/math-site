// lib/actions/room.ts
'use server';

import { RoomServiceClient } from 'livekit-server-sdk';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

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
  const roomName = `course-${courseId}`;

  try {
    const participants = await roomService.listParticipants(roomName);
    // Check if the teacher is among the participants
    return participants.some((p) => p.identity === course.teacherId);
  } catch (error) {
    // If room doesn't exist or error, treat as teacher not present
    return false;
  }
}