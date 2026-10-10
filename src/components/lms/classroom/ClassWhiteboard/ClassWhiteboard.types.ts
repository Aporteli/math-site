import type { Room } from 'livekit-client';
import type { Student } from './utils/types';

export interface ClassWhiteboardProps {
  room: Room | null;
  courseId: string;
  courseTitle: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isTeacher?: boolean;
  students: Student[];
  enableSlashPrompts?: boolean;
  slashPromptsUserId?: string;
}
