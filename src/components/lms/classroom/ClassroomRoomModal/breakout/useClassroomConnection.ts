'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Room } from 'livekit-client';
import {
  IDLE_BREAKOUT,
  isBreakoutRoomKey,
  type BreakoutAssignment,
  type BreakoutRoomKey,
} from '@/lib/livekit/breakout';
import type { PresencePerson } from './BreakoutContext';

interface MediaSession {
  token: string;
  roomKey: BreakoutRoomKey;
  secondary: boolean;
  breakout: BreakoutAssignment;
  boardToken: string | null;
}

interface BreakoutStatus {
  active: boolean;
  a: string[];
  b: string[];
  selfRoom: BreakoutRoomKey;
}

const EMPTY_MONITORS: Record<BreakoutRoomKey, string | null> = {
  main: null,
  a: null,
  b: null,
};

const LISTEN_ON: Record<BreakoutRoomKey, boolean> = { main: true, a: true, b: true };

export function useClassroomConnection(courseId: string, isTeacher: boolean) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaToken, setMediaToken] = useState('');
  const [roomKey, setRoomKey] = useState<BreakoutRoomKey>('main');
  const [secondary, setSecondary] = useState(false);
  const [boardToken, setBoardToken] = useState<string | null>(null);
  const [breakout, setBreakout] = useState<BreakoutAssignment>(IDLE_BREAKOUT);
  const [monitorTokens, setMonitorTokens] = useState(EMPTY_MONITORS);
  const [joined, setJoined] = useState<'a' | 'b' | null>(null);
  const [listen, setListen] = useState(LISTEN_ON);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [presence, setPresenceState] = useState<Record<BreakoutRoomKey, Record<string, PresencePerson[]>>>({
    main: {},
    a: {},
    b: {},
  });

  const ignoreDisconnectUntil = useRef(0);
  const roomKeyRef = useRef<BreakoutRoomKey>('main');
  const joinedRef = useRef<'a' | 'b' | null>(null);
  const syncLock = useRef<Promise<void> | null>(null);
  const monitorRooms = useRef<Set<Room>>(new Set());
  const blockedMonitors = useRef<Set<string>>(new Set());

  const applyMedia = useCallback((data: MediaSession) => {
    roomKeyRef.current = data.roomKey;
    setRoomKey(data.roomKey);
    setMediaToken(data.token);
    setSecondary(Boolean(data.secondary));
    setBoardToken(data.boardToken);
    setBreakout(data.breakout?.active ? data.breakout : IDLE_BREAKOUT);
  }, []);

  const connectMedia = useCallback(
    async (target: BreakoutRoomKey) => {
      ignoreDisconnectUntil.current = Date.now() + 5000;
      setMoving(true);
      const params = new URLSearchParams({ courseId });
      if (isTeacher) params.set('roomKey', target);
      const res = await fetch(`/api/livekit?${params.toString()}`);
      if (!res.ok) {
        ignoreDisconnectUntil.current = 0;
        setMoving(false);
        throw new Error((await res.text()) || 'ოთახში გადასვლა ვერ მოხერხდა');
      }
      const data = (await res.json()) as MediaSession;
      applyMedia(data);
    },
    [applyMedia, courseId, isTeacher],
  );

  const requestSync = useCallback(() => {
    if (syncLock.current) return syncLock.current;
    const run = (async () => {
      const res = await fetch(`/api/livekit/breakout?courseId=${encodeURIComponent(courseId)}`);
      if (!res.ok) return;
      const data = (await res.json()) as BreakoutStatus;
      if (!isBreakoutRoomKey(data.selfRoom)) return;
      const next: BreakoutAssignment = {
        active: Boolean(data.active),
        a: Array.isArray(data.a) ? data.a : [],
        b: Array.isArray(data.b) ? data.b : [],
      };
      setBreakout(next);
      if (!next.active) {
        joinedRef.current = null;
        setJoined(null);
      }
      const target: BreakoutRoomKey = !next.active ? 'main' : isTeacher ? (joinedRef.current ?? 'main') : data.selfRoom;
      if (target !== roomKeyRef.current) {
        try {
          await connectMedia(target);
        } catch (err) {
          console.error('Breakout move failed:', err);
        }
      }
    })().finally(() => {
      syncLock.current = null;
    });
    syncLock.current = run;
    return run;
  }, [connectMedia, courseId, isTeacher]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/livekit?courseId=${encodeURIComponent(courseId)}`);
        if (!res.ok) throw new Error((await res.text()) || 'ოთახში შესვლა ვერ მოხერხდა');
        const data = (await res.json()) as MediaSession;
        if (cancelled) return;
        applyMedia(data);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'დაფიქსირდა შეცდომა');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [applyMedia, courseId]);

  useEffect(() => {
    if (loading || error) return;
    const timer = setInterval(() => {
      void requestSync();
    }, 5000);
    return () => clearInterval(timer);
  }, [error, loading, requestSync]);

  useEffect(() => {
    if (!isTeacher || !breakout.active) {
      setMonitorTokens(EMPTY_MONITORS);
      return;
    }
    let cancelled = false;
    const keys: BreakoutRoomKey[] = ['main', 'a', 'b'];
    void (async () => {
      const next: Record<BreakoutRoomKey, string | null> = { main: null, a: null, b: null };
      for (const key of keys) {
        if (key === roomKey) continue;
        const params = new URLSearchParams({
          courseId,
          intent: 'monitor',
          roomKey: key,
        });
        const res = await fetch(`/api/livekit?${params.toString()}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { token?: string };
        next[key] = data.token ?? null;
      }
      if (!cancelled) setMonitorTokens(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [breakout.active, courseId, isTeacher, roomKey]);

  const resumeMonitorAudio = useCallback(() => {
    for (const room of monitorRooms.current) void room.startAudio();
  }, []);

  const registerMonitor = useCallback((room: Room) => {
    monitorRooms.current.add(room);
    return () => {
      monitorRooms.current.delete(room);
    };
  }, []);

  const setMonitorBlocked = useCallback((id: string, blocked: boolean) => {
    if (blocked) blockedMonitors.current.add(id);
    else blockedMonitors.current.delete(id);
    setAudioBlocked(blockedMonitors.current.size > 0);
  }, []);

  const split = useCallback(
    async (groupA: string[], groupB: string[]) => {
      setBusy(true);
      setActionError(null);
      try {
        const res = await fetch('/api/livekit/breakout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, action: 'split', a: groupA, b: groupB }),
        });
        if (!res.ok) throw new Error((await res.text()) || 'გაყოფა ვერ შესრულდა');
        setDashboardOpen(true);
        setListen(LISTEN_ON);
        await requestSync();
        resumeMonitorAudio();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'გაყოფა ვერ შესრულდა');
      } finally {
        setBusy(false);
      }
    },
    [courseId, requestSync, resumeMonitorAudio],
  );

  const merge = useCallback(async () => {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch('/api/livekit/breakout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, action: 'merge' }),
      });
      if (!res.ok) throw new Error((await res.text()) || 'გაერთიანება ვერ შესრულდა');
      joinedRef.current = null;
      setJoined(null);
      await requestSync();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'გაერთიანება ვერ შესრულდა');
    } finally {
      setBusy(false);
    }
  }, [courseId, requestSync]);

  const joinRoom = useCallback(
    async (key: 'a' | 'b') => {
      const next = joinedRef.current === key ? null : key;
      joinedRef.current = next;
      setJoined(next);
      if (next) setListen((prev) => ({ ...prev, [key]: true }));
      setActionError(null);
      const target: BreakoutRoomKey = breakout.active ? (next ?? 'main') : 'main';
      try {
        if (target !== roomKeyRef.current) await connectMedia(target);
        resumeMonitorAudio();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'ოთახში შესვლა ვერ მოხერხდა');
      }
    },
    [breakout.active, connectMedia, resumeMonitorAudio],
  );

  const toggleListen = useCallback(
    (key: BreakoutRoomKey) => {
      setListen((prev) => ({ ...prev, [key]: !prev[key] }));
      resumeMonitorAudio();
    },
    [resumeMonitorAudio],
  );

  const studentVolume = useCallback((userId: string) => volumes[userId] ?? 1, [volumes]);
  const isMuted = useCallback((userId: string) => Boolean(muted[userId]), [muted]);

  const setStudentVolume = useCallback((userId: string, volume: number) => {
    const clamped = Math.min(1, Math.max(0, volume));
    setVolumes((prev) => ({ ...prev, [userId]: clamped }));
    if (clamped > 0) setMuted((prev) => ({ ...prev, [userId]: false }));
  }, []);

  const toggleStudentMute = useCallback((userId: string) => {
    setMuted((prev) => ({ ...prev, [userId]: !prev[userId] }));
  }, []);

  const heardVolume = useCallback(
    (userId: string, key: BreakoutRoomKey) => {
      if (!listen[key]) return 0;
      if (muted[userId]) return 0;
      return volumes[userId] ?? 1;
    },
    [listen, muted, volumes],
  );

  const setPresence = useCallback((key: BreakoutRoomKey, source: string, people: PresencePerson[]) => {
    setPresenceState((prev) => ({
      ...prev,
      [key]: { ...prev[key], [source]: people },
    }));
  }, []);

  const peopleIn = useCallback(
    (key: BreakoutRoomKey) => {
      const merged = new Map<string, PresencePerson>();
      for (const group of Object.values(presence[key])) {
        for (const person of group) {
          const current = merged.get(person.userId);
          if (!current) {
            merged.set(person.userId, person);
            continue;
          }
          merged.set(person.userId, {
            ...current,
            name: person.name || current.name,
            speaking: current.speaking || person.speaking,
          });
        }
      }
      return [...merged.values()];
    },
    [presence],
  );

  const markMediaConnected = useCallback(() => {
    setMoving(false);
  }, []);

  const toggleDashboard = useCallback(() => {
    setDashboardOpen((open) => !open);
  }, []);

  return useMemo(
    () => ({
      loading,
      error,
      isTeacher,
      mediaToken,
      roomKey,
      secondary,
      boardToken,
      monitorTokens,
      breakout,
      joined,
      listen,
      dashboardOpen,
      moving,
      busy,
      actionError,
      audioBlocked,
      ignoreDisconnectUntil,
      setDashboardOpen,
      toggleDashboard,
      requestSync,
      split,
      merge,
      joinRoom,
      toggleListen,
      studentVolume,
      isMuted,
      setStudentVolume,
      toggleStudentMute,
      heardVolume,
      setPresence,
      peopleIn,
      markMediaConnected,
      registerMonitor,
      setMonitorBlocked,
      resumeMonitorAudio,
    }),
    [
      actionError,
      audioBlocked,
      boardToken,
      breakout,
      busy,
      dashboardOpen,
      error,
      heardVolume,
      isMuted,
      isTeacher,
      joinRoom,
      joined,
      listen,
      loading,
      markMediaConnected,
      mediaToken,
      merge,
      monitorTokens,
      moving,
      peopleIn,
      registerMonitor,
      requestSync,
      resumeMonitorAudio,
      roomKey,
      secondary,
      setMonitorBlocked,
      setPresence,
      setStudentVolume,
      split,
      studentVolume,
      toggleDashboard,
      toggleListen,
      toggleStudentMute,
    ],
  );
}
