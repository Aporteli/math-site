import type { Room } from 'livekit-client';

export type MenuId = 'mic' | 'cam' | 'more';

export interface ClassroomVideoPanelProps {
  token: string;
  courseId: string;
  isTeacher: boolean;
  /** `true`, თუ იგივე ექაუნთით სხვა მოწყობილობა უკვე ოთახშია (ხმა პირველზე რჩება). */
  secondary?: boolean;
  onClose: () => void;
  onRoom: (room: Room) => void;
  expanded?: boolean;

}