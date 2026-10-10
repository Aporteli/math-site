'use client';

import { X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { ParticipantGroup, ParticipantOption } from '@/lib/actions/journal-participants';
import { COLOR_DOT } from '../constants';
import type { JournalEvent, PopoverState, UpdateDraftHandler } from '../types';
import { EventColorPicker } from './EventColorPicker';
import { EventDescriptionField } from './EventDescriptionField';
import { EventLocationField } from './EventLocationField';
import { EventPopoverActions } from './EventPopoverActions';
import { EventReminderField } from './EventReminderField';
import { EventScheduleFields } from './EventScheduleFields';
import { GuestField } from './GuestField';
import { ParticipantPicker } from './ParticipantPicker';

interface EventPopoverProps {
  popover: PopoverState | null;
  draft: JournalEvent | undefined;
  expanded: boolean;
  isSaving: boolean;
  guestDraft: string;
  setGuestDraft: Dispatch<SetStateAction<string>>;
  participantsOpen: boolean;
  setParticipantsOpen: Dispatch<SetStateAction<boolean>>;
  participantSearch: string;
  setParticipantSearch: Dispatch<SetStateAction<string>>;
  participantGroups: ParticipantGroup[];
  participantsLoading: boolean;
  onClose: () => void;
  onUpdateDraft: UpdateDraftHandler;
  onSave: () => void;
  onDelete: () => void;
  onExpand: () => void;
  onAddGuest: () => void;
  onRemoveGuest: (name: string) => void;
  onRemoveParticipant: (id: string) => void;
  onToggleParticipant: (option: ParticipantOption) => void;
  isParticipantSelected: (id: string) => boolean;
}

export function EventPopover({
  popover,
  draft,
  expanded,
  isSaving,
  guestDraft,
  setGuestDraft,
  participantsOpen,
  setParticipantsOpen,
  participantSearch,
  setParticipantSearch,
  participantGroups,
  participantsLoading,
  onClose,
  onUpdateDraft,
  onSave,
  onDelete,
  onExpand,
  onAddGuest,
  onRemoveGuest,
  onRemoveParticipant,
  onToggleParticipant,
  isParticipantSelected,
}: EventPopoverProps) {
  if (!popover || !draft) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        style={{ top: popover.anchor.top, left: popover.anchor.left }}
        className={`fixed z-50 w-80 rounded-box border border-hairline bg-paper shadow-2xl transition-[top,width] duration-150 animate-in fade-in zoom-in-95
            }`}
        onClick={(e) => e.stopPropagation()}>
        <div className={`h-1.5 w-full rounded-box ${COLOR_DOT[draft.color]}`} />

        <div className="max-h-[85vh] overflow-y-auto p-4 space-y-4 thin-scrollbar">
          <div className="flex items-start gap-2">
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => onUpdateDraft({ title: e.target.value })}
              placeholder="ღონისძიების სათაური"
              className="flex-1 border-b-2 border-hairline bg-transparent pb-1.5 text-base font-bold text-ink outline-none transition-colors placeholder:font-medium placeholder:text-muted/60 focus:border-[#465D73]"
            />
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-box text-muted transition-colors hover:bg-sectionHeader hover:text-ink">
              <X className="size-4" />
            </button>
          </div>

          <EventScheduleFields draft={draft} onUpdateDraft={onUpdateDraft} />
          <EventColorPicker color={draft.color} onUpdateDraft={onUpdateDraft} />

          {expanded && (
            <>
              <ParticipantPicker
                participants={draft.participants ?? []}
                participantsOpen={participantsOpen}
                setParticipantsOpen={setParticipantsOpen}
                participantSearch={participantSearch}
                setParticipantSearch={setParticipantSearch}
                participantGroups={participantGroups}
                participantsLoading={participantsLoading}
                isParticipantSelected={isParticipantSelected}
                onToggleParticipant={onToggleParticipant}
                onRemoveParticipant={onRemoveParticipant}
              />
              <EventLocationField location={draft.location} onUpdateDraft={onUpdateDraft} />
              <GuestField
                guests={draft.guests}
                guestDraft={guestDraft}
                setGuestDraft={setGuestDraft}
                onAddGuest={onAddGuest}
                onRemoveGuest={onRemoveGuest}
              />
              <EventDescriptionField description={draft.description} onUpdateDraft={onUpdateDraft} />
              <EventReminderField reminder={draft.reminder} onUpdateDraft={onUpdateDraft} />
            </>
          )}

          <EventPopoverActions
            mode={popover.mode}
            expanded={expanded}
            title={draft.title}
            isSaving={isSaving}
            onDelete={onDelete}
            onExpand={onExpand}
            onSave={onSave}
          />
        </div>
      </div>
    </>
  );
}
