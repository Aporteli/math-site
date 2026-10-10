'use client';

import { useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { useBreakout } from '@/components/lms/classroom/ClassroomRoomModal/breakout/BreakoutContext';
import { startLiveKitDiagnostics } from './start-diagnostics';

export function LiveKitDiagnosticsReporter({
  courseId,
  secondary = false,
}: {
  courseId: string;
  secondary?: boolean;
}) {
  const room = useRoomContext();
  const { roomKey } = useBreakout();

  useEffect(() => {
    return startLiveKitDiagnostics({ room, courseId, roomKey, secondary });
  }, [courseId, room, roomKey, secondary]);

  return null;
}
