'use client';

import { MapPin } from 'lucide-react';
import type { UpdateDraftHandler } from '../types';

interface EventLocationFieldProps {
  location: string;
  onUpdateDraft: UpdateDraftHandler;
}

export function EventLocationField({ location, onUpdateDraft }: EventLocationFieldProps) {
  return (
    <div className="flex items-center gap-3">
      <MapPin className="size-4 shrink-0 text-brass-strong" />
      <input
        value={location}
        onChange={(e) => onUpdateDraft({ location: e.target.value })}
        placeholder="მდებარეობა"
        className="flex-1 rounded-box border border-hairline bg-searchInput px-2.5 py-1.5 text-xs font-medium text-searchInputText outline-none placeholder:text-muted/60 focus:border-[#465D73]"
      />
    </div>
  );
}
