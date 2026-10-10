'use client';

import { Bell } from 'lucide-react';
import { REMINDER_LABELS } from '../constants';
import type { ReminderOption, UpdateDraftHandler } from '../types';

interface EventReminderFieldProps {
  reminder: ReminderOption;
  onUpdateDraft: UpdateDraftHandler;
}

export function EventReminderField({ reminder, onUpdateDraft }: EventReminderFieldProps) {
  return (
    <div className="flex items-center gap-3">
      <Bell className="size-4 shrink-0 text-brass-strong" />
      <select
        value={reminder}
        onChange={(e) => onUpdateDraft({ reminder: e.target.value as ReminderOption })}
        className="flex-1 rounded-box border border-hairline bg-searchInput px-2.5 py-1.5 text-xs font-bold text-searchInputText outline-none focus:border-[#465D73]">
        {(Object.keys(REMINDER_LABELS) as ReminderOption[]).map((key) => (
          <option key={key} value={key}>
            {REMINDER_LABELS[key]}
          </option>
        ))}
      </select>
    </div>
  );
}
