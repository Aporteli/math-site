'use client';

import { useEffect, useRef, useState, type Dispatch, type PointerEvent, type SetStateAction } from 'react';
import { saveJournalEventAction } from '@/lib/actions/journal';
import { HOUR_HEIGHT } from '../constants';
import { minutesToTime, snapTo, timeToMinutes } from '../journal-time';
import type { DragPreview, DragState, JournalEvent } from '../types';

export function useJournalDrag(events: JournalEvent[], setEvents: Dispatch<SetStateAction<JournalEvent[]>>) {
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function startDragLoop() {
    if (rafRef.current !== null) return;

    const tick = () => {
      const d = dragRef.current;
      if (!d) {
        rafRef.current = null;
        return;
      }

      const sc = d.scrollContainer;
      if (sc && d.moved) {
        const r = sc.getBoundingClientRect();
        const EDGE = 40;
        const SPEED = 12;
        if (d.lastClientY < r.top + EDGE) {
          sc.scrollTop -= SPEED;
        } else if (d.lastClientY > r.bottom - EDGE) {
          sc.scrollTop += SPEED;
        }
      }

      if (d.moved) {
        const scrollTop = d.scrollContainer?.scrollTop ?? 0;
        const scrollDelta = scrollTop - d.startScrollTop;

        const dxViewport = d.lastClientX - d.startX;
        const dyContent = d.lastClientY - d.startY + scrollDelta;

        const minuteDelta = snapTo((dyContent / HOUR_HEIGHT) * 60, 15);
        const dyPx = (minuteDelta / 60) * HOUR_HEIGHT;

        const hit = d.columns.find((c) => d.lastClientX >= c.left && d.lastClientX < c.right);
        if (hit) d.targetDateKey = hit.dateKey;
        d.minuteDelta = minuteDelta;

        const rawStart = timeToMinutes(d.originStart) + minuteDelta;
        const startMin = Math.max(0, Math.min(24 * 60 - d.durationMin, rawStart));
        const startTime = minutesToTime(startMin);
        const endTime = minutesToTime(startMin + d.durationMin);

        setDragPreview((prev) => {
          if (
            prev &&
            prev.id === d.id &&
            prev.dx === dxViewport &&
            prev.dy === dyPx &&
            prev.startTime === startTime &&
            prev.endTime === endTime
          ) {
            return prev;
          }
          return { id: d.id, dx: dxViewport, dy: dyPx, startTime, endTime };
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }

  function handleEventPointerDown(e: PointerEvent<HTMLDivElement>, ev: JournalEvent, dateKey: string) {
    if (e.button !== 0 || ev.allDay || ev.repeat !== 'none') return;

    e.stopPropagation();
    didDragRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);

    const scrollContainer = e.currentTarget.closest('.overflow-y-auto') as HTMLElement | null;

    const columns = Array.from(document.querySelectorAll<HTMLElement>('[data-day-column]')).map((c) => {
      const r = c.getBoundingClientRect();
      return { dateKey: c.dataset.dateKey!, left: r.left, right: r.right };
    });

    dragRef.current = {
      id: ev.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
      startScrollTop: scrollContainer?.scrollTop ?? 0,
      scrollContainer,
      originStart: ev.startTime,
      originDateKey: dateKey,
      durationMin: Math.max(30, timeToMinutes(ev.endTime) - timeToMinutes(ev.startTime)),
      moved: false,
      minuteDelta: 0,
      targetDateKey: dateKey,
      columns,
    };

    startDragLoop();
  }

  function handleEventPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;

    d.lastClientX = e.clientX;
    d.lastClientY = e.clientY;

    if (!d.moved) {
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      d.moved = true;
      didDragRef.current = true;
    }
  }

  function handleEventPointerUp(e: PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    dragRef.current = null;
    setDragPreview(null);

    if (!d.moved) return;

    const rawStart = timeToMinutes(d.originStart) + d.minuteDelta;
    const startMin = Math.max(0, Math.min(24 * 60 - d.durationMin, rawStart));

    void moveEvent(d.id, d.targetDateKey, minutesToTime(startMin), minutesToTime(startMin + d.durationMin));
  }

  async function moveEvent(id: string, date: string, startTime: string, endTime: string) {
    const current = events.find((e) => e.id === id);
    if (!current) return;
    if (current.date === date && current.startTime === startTime && current.endTime === endTime) return;

    const next: JournalEvent = { ...current, date, startTime, endTime, allDay: false };

    setEvents((prev) => prev.map((e) => (e.id === id ? next : e)));
    const res = await saveJournalEventAction({
      ...next,
      participants: next.participants ?? [],
    });
    if (!res.success) {
      setEvents((prev) => prev.map((e) => (e.id === id ? current : e)));
    }
  }

  return {
    dragPreview,
    didDragRef,
    handleEventPointerDown,
    handleEventPointerMove,
    handleEventPointerUp,
  };
}
