'use client';

import { useEffect, useState, type Dispatch, type MouseEvent, type SetStateAction } from 'react';
import { deleteJournalEventAction, saveJournalEventAction } from '@/lib/actions/journal';
import type { ParticipantOption, ParticipantRef } from '@/lib/actions/journal-participants';
import type { VirtualScheduleEvent } from '@/lib/actions/journal-schedule';
import {
  POPOVER_EXPANDED_HEIGHT,
  POPOVER_FULL_WIDTH,
  POPOVER_QUICK_HEIGHT,
  POPOVER_QUICK_WIDTH,
  VIRTUAL_POPUP_WIDTH,
} from '../constants';
import { emptyDraft, toDateKey } from '../journal-time';
import type { JournalEvent, PopoverState, VirtualPopupState } from '../types';

export function useJournalPopover(
  setEvents: Dispatch<SetStateAction<JournalEvent[]>>,
  today: Date,
  didDragRef: { current: boolean },
) {
  const [isSaving, setIsSaving] = useState(false);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [guestDraft, setGuestDraft] = useState('');
  const [virtualPopup, setVirtualPopup] = useState<VirtualPopupState | null>(null);

  /* ── Participant picker state ── */
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');

  function closePopover() {
    setPopover(null);
    setExpanded(false);
    setGuestDraft('');
    setParticipantsOpen(false);
    setParticipantSearch('');
  }

  useEffect(() => {
    if (!popover && !virtualPopup) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePopover();
        setVirtualPopup(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [popover, virtualPopup]);

  function clampPosition(rawTop: number, rawLeft: number, width: number, isExp = false) {
    const padding = 16;
    const height = isExp ? POPOVER_EXPANDED_HEIGHT : POPOVER_QUICK_HEIGHT;
    const maxLeft = window.innerWidth - width - padding;
    const maxTop = window.innerHeight - height - padding;
    return {
      left: Math.min(Math.max(padding, rawLeft), Math.max(padding, maxLeft)),
      top: Math.min(Math.max(padding, rawTop), Math.max(padding, maxTop)),
    };
  }

  function openCreateFromElement(el: HTMLElement, date: Date, startH = 9) {
    const rect = el.getBoundingClientRect();
    const pos = clampPosition(rect.top, rect.left, POPOVER_QUICK_WIDTH, false);
    setExpanded(false);
    setPopover({
      mode: 'create',
      anchor: pos,
      draft: emptyDraft(toDateKey(date), startH, (startH + 1) % 24),
    });
  }

  function openVirtualPopup(el: HTMLElement, v: VirtualScheduleEvent, dateKey: string) {
    const rect = el.getBoundingClientRect();
    const width = Math.min(VIRTUAL_POPUP_WIDTH, window.innerWidth - 32);
    const pos = clampPosition(rect.bottom + 8, rect.left, width, false);
    setVirtualPopup({ event: v, dateKey, anchor: pos });
  }

  function handleEventClick(e: MouseEvent<HTMLDivElement>, ev: JournalEvent) {
    e.stopPropagation();
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = clampPosition(rect.top, rect.left, POPOVER_FULL_WIDTH, true);
    setExpanded(true);
    setPopover({
      mode: 'edit',
      anchor: pos,
      draft: { ...ev, participants: ev.participants ?? [] },
    });
  }

  function handleAddClick(e: MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = clampPosition(rect.bottom + 8, rect.right - POPOVER_QUICK_WIDTH, POPOVER_QUICK_WIDTH, false);
    setExpanded(false);
    setPopover({ mode: 'create', anchor: pos, draft: emptyDraft(toDateKey(today)) });
  }

  function toggleExpandMore() {
    setExpanded(true);
    setPopover((prev) => {
      if (!prev) return null;
      const reClamped = clampPosition(prev.anchor.top, prev.anchor.left, POPOVER_FULL_WIDTH, true);
      return { ...prev, anchor: reClamped };
    });
  }

  function updateDraft(patch: Partial<JournalEvent>) {
    setPopover((prev) => (prev ? { ...prev, draft: { ...prev.draft, ...patch } } : prev));
  }

  async function handleSave() {
    if (!popover) return;
    const draft = popover.draft;
    if (!draft.title.trim()) return;

    setIsSaving(true);
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === draft.id);
      if (exists) return prev.map((e) => (e.id === draft.id ? draft : e));
      return [...prev, draft];
    });
    closePopover();

    const res = await saveJournalEventAction({
      ...draft,
      participants: draft.participants ?? [],
    });
    if (!res.success) console.error('შეცდომა შენახვისას');
    setIsSaving(false);
  }

  async function handleDelete() {
    if (!popover) return;
    const idToDelete = popover.draft.id;
    setEvents((prev) => prev.filter((e) => e.id !== idToDelete));
    closePopover();
    await deleteJournalEventAction(idToDelete);
  }

  function addGuest() {
    const value = guestDraft.trim();
    if (!value || !popover) return;
    updateDraft({ guests: [...popover.draft.guests, value] });
    setGuestDraft('');
  }

  function removeGuest(name: string) {
    if (!popover) return;
    updateDraft({ guests: popover.draft.guests.filter((g) => g !== name) });
  }

  function isParticipantSelected(id: string) {
    return popover?.draft.participants?.some((p) => p.id === id) ?? false;
  }

  function toggleParticipant(option: ParticipantOption) {
    if (!popover) return;
    const current = popover.draft.participants ?? [];
    const exists = current.some((p) => p.id === option.id);
    const next: ParticipantRef[] = exists
      ? current.filter((p) => p.id !== option.id)
      : [
          ...current,
          {
            id: option.id,
            name: option.name,
            type: option.type,
            userId: option.userId,
            individualStudentId: option.individualStudentId,
            courseId: option.courseId,
            courseTitle: option.courseTitle,
          },
        ];
    updateDraft({ participants: next });
  }

  function removeParticipant(id: string) {
    if (!popover) return;
    updateDraft({
      participants: (popover.draft.participants ?? []).filter((p) => p.id !== id),
    });
  }

  const draft = popover?.draft;

  return {
    isSaving,
    popover,
    expanded,
    guestDraft,
    setGuestDraft,
    virtualPopup,
    setVirtualPopup,
    participantsOpen,
    setParticipantsOpen,
    participantSearch,
    setParticipantSearch,
    closePopover,
    openCreateFromElement,
    openVirtualPopup,
    handleEventClick,
    handleAddClick,
    toggleExpandMore,
    updateDraft,
    handleSave,
    handleDelete,
    addGuest,
    removeGuest,
    isParticipantSelected,
    toggleParticipant,
    removeParticipant,
    draft,
  };
}
