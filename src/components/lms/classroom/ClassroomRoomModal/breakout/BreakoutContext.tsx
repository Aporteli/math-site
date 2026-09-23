'use client';

import { createContext, useContext, type MutableRefObject } from 'react';
import type { Room } from 'livekit-client';
import type { BreakoutAssignment, BreakoutRoomKey } from '@/lib/livekit/breakout';

export interface PresencePerson {
  userId: string;
  name: string;
  speaking: boolean;
}

export interface BreakoutContextValue {
  isTeacher: boolean;
  mediaToken: string;
  roomKey: BreakoutRoomKey;
  secondary: boolean;
  boardToken: string | null;
  monitorTokens: Record<BreakoutRoomKey, string | null>;
  breakout: BreakoutAssignment;
  joined: 'a' | 'b' | null;
  listen: Record<BreakoutRoomKey, boolean>;
  dashboardOpen: boolean;
  moving: boolean;
  busy: boolean;
  actionError: string | null;
  audioBlocked: boolean;
  ignoreDisconnectUntil: MutableRefObject<number>;
  setDashboardOpen: (open: boolean) => void;
  toggleDashboard: () => void;
  requestSync: () => Promise<void>;
  split: (groupA: string[], groupB: string[]) => Promise<void>;
  merge: () => Promise<void>;
  joinRoom: (key: 'a' | 'b') => Promise<void>;
  toggleListen: (key: BreakoutRoomKey) => void;
  studentVolume: (userId: string) => number;
  isMuted: (userId: string) => boolean;
  setStudentVolume: (userId: string, volume: number) => void;
  toggleStudentMute: (userId: string) => void;
  heardVolume: (userId: string, roomKey: BreakoutRoomKey) => number;
  setPresence: (roomKey: BreakoutRoomKey, source: string, people: PresencePerson[]) => void;
  peopleIn: (roomKey: BreakoutRoomKey) => PresencePerson[];
  markMediaConnected: () => void;
  registerMonitor: (room: Room) => () => void;
  setMonitorBlocked: (id: string, blocked: boolean) => void;
  resumeMonitorAudio: () => void;
}

export const BreakoutContext = createContext<BreakoutContextValue | null>(null);

export function useBreakout(): BreakoutContextValue {
  const value = useContext(BreakoutContext);
  if (!value) throw new Error('useBreakout must be used inside the classroom');
  return value;
}
