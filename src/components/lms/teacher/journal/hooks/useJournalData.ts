'use client';

import { useEffect, useState } from 'react';
import { getJournalEventsAction } from '@/lib/actions/journal';
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
    loading,
    participantGroups,
    participantsLoading,
  };
}
