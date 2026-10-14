'use client';

import { useEffect, useState } from 'react';
import { getJournalEventsAction } from '@/lib/actions/journal';
import {
  getJournalLessonMarksAction,
  saveJournalLessonMarkAction,
  type JournalLessonMark,
} from '@/lib/actions/journal-lesson-marks';
import {
  getJournalParticipantOptionsAction,
  type ParticipantGroup,
  type ParticipantRef,
} from '@/lib/actions/journal-participants';
import { getScheduleLessonsAction, type VirtualScheduleEvent } from '@/lib/actions/journal-schedule';
import type { JournalEvent } from '../types';

export function useJournalData() {
  const [events, setEvents] = useState<JournalEvent[]>([]);
  const [virtualEvents, setVirtualEvents] = useState<VirtualScheduleEvent[]>([]);
  const [marks, setMarks] = useState<Record<string, JournalLessonMark>>({});
  const [loading, setLoading] = useState(true);
  const [participantGroups, setParticipantGroups] = useState<ParticipantGroup[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  /* ── Load manual events ── */
  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      const res = await getJournalEventsAction();
      if (res.success && res.events) {
        setEvents(
          (res.events as JournalEvent[]).map((e) => ({
            ...e,
            participants: (e.participants as ParticipantRef[] | undefined) ?? [],
          })),
        );
      }
      setLoading(false);
    }
    loadEvents();
  }, []);

  /* ── Load virtual schedule lessons ── */
  useEffect(() => {
    async function loadSchedule() {
      const res = await getScheduleLessonsAction();
      if (res.success) setVirtualEvents(res.events);
    }
    loadSchedule();
  }, []);

  useEffect(() => {
    async function loadMarks() {
      const res = await getJournalLessonMarksAction();
      if (!res.success) return;
      const next: Record<string, JournalLessonMark> = {};
      for (const mark of res.marks) next[`${mark.eventId}|${mark.date}`] = mark;
      setMarks(next);
    }
    loadMarks();
  }, []);

  async function saveLessonMark(eventId: string, date: string, skippedStudentIds: string[], comment: string) {
    const key = `${eventId}|${date}`;
    let previous: JournalLessonMark | undefined;
    setMarks((prev) => {
      previous = prev[key];
      return { ...prev, [key]: { eventId, date, skippedStudentIds, comment } };
    });
    const res = await saveJournalLessonMarkAction({ eventId, date, skippedStudentIds, comment });
    if (!res.success) {
      setMarks((prev) => {
        const copy = { ...prev };
        if (previous) copy[key] = previous;
        else delete copy[key];
        return copy;
      });
    }
  }

  /* ── Load participant options ── */
  useEffect(() => {
    async function loadParticipantOptions() {
      setParticipantsLoading(true);
      const res = await getJournalParticipantOptionsAction();
      if (res.success) setParticipantGroups(res.groups);
      setParticipantsLoading(false);
    }
    loadParticipantOptions();
  }, []);

  return {
    events,
    setEvents,
    virtualEvents,
    marks,
    saveLessonMark,
    loading,
    participantGroups,
    participantsLoading,
  };
}
