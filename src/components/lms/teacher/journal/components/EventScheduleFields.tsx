'use client';

import { Clock, Repeat } from 'lucide-react';
import { REPEAT_LABELS } from '../constants';
import type { JournalEvent, RepeatOption, UpdateDraftHandler } from '../types';

interface EventScheduleFieldsProps {
  draft: JournalEvent;
  onUpdateDraft: UpdateDraftHandler;
}

export function EventScheduleFields({ draft, onUpdateDraft }: EventScheduleFieldsProps) {
  return (
    <div className="flex items-start gap-3">
      <Clock className="mt-2 size-4 shrink-0 text-brass-strong" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={draft.date}
            onChange={(e) => onUpdateDraft({ date: e.target.value })}
            className="flex-1 rounded-box border border-hairline bg-searchInput px-2.5 py-1.5 text-xs font-bold text-searchInputText outline-none focus:border-[#465D73]"
          />
          <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted">
            <input
              type="checkbox"
              checked={draft.allDay}
              onChange={(e) => onUpdateDraft({ allDay: e.target.checked })}
              className="size-3.5 rounded border-hairline accent-[#465D73]"
            />
            მთელი დღე
          </label>
        </div>
        {!draft.allDay && (
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={draft.startTime}
              onChange={(e) => onUpdateDraft({ startTime: e.target.value })}
              className="flex-1 rounded-box border border-hairline bg-searchInput px-2.5 py-1.5 text-xs font-bold text-searchInputText outline-none focus:border-[#465D73]"
            />
            <span className="text-xs text-muted">—</span>
            <input
              type="time"
              value={draft.endTime}
              onChange={(e) => onUpdateDraft({ endTime: e.target.value })}
              className="flex-1 rounded-box border border-hairline bg-searchInput px-2.5 py-1.5 text-xs font-bold text-searchInputText outline-none focus:border-[#465D73]"
            />
          </div>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Repeat className=" size-3.5 shrink-0 text-brass-strong" />
          <select
            value={draft.repeat}
            onChange={(e) => onUpdateDraft({ repeat: e.target.value as RepeatOption })}
            className="flex-1 rounded-box border border-hairline bg-searchInput px-2.5 py-1.5 text-xs font-bold text-searchInputText outline-none focus:border-[#465D73]">
            {(Object.keys(REPEAT_LABELS) as RepeatOption[]).map((key) => (
              <option key={key} value={key}>
                {REPEAT_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
