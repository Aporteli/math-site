import type { RefObject } from 'react';
import type { RemoteParticipant } from 'livekit-client';

export interface MoreMenuProps {
  anchorRef: RefObject<HTMLElement | null>;
  courseId: string;
  isTeacher: boolean;
  isolatedIdentities: string[];
  onIsolationChange: (isolatedIdentities: string[]) => void;
}

export interface StudentModalProps {
  open: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  student: RemoteParticipant | null;
  isTeacher: boolean;
  isIsolated: boolean;
  onToggleIsolation: (identity: string) => void;
}

export interface StudentsListProps {
  participants: RemoteParticipant[];
  isTeacher: boolean;
  isolatedIdentities: string[];
  onIsolationChange: (isolatedIdentities: string[]) => void;
}