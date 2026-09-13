import type { Room } from 'livekit-client';

export type MenuId = 'mic' | 'cam' | 'more';

export interface ClassroomVideoPanelProps {
  token: string;
  courseId: string;
  isTeacher: boolean;
  onClose: () => void;
  onRoom: (room: Room) => void;
}