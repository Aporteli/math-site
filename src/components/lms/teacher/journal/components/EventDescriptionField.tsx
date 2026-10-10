'use client';

import { AlignLeft } from 'lucide-react';
import type { UpdateDraftHandler } from '../types';

interface EventDescriptionFieldProps {
  description: string;
  onUpdateDraft: UpdateDraftHandler;
}

export function EventDescriptionField({ description, onUpdateDraft }: EventDescriptionFieldProps) {
  return (
    <div className="flex items-start gap-3">
      <AlignLeft className="mt-2 size-4 shrink-0 text-brass-strong" />
      <textarea
        value={description}
        onChange={(e) => onUpdateDraft({ description: e.target.value })}
        placeholder="აღწერა"
        rows={3}
        className="flex-1 resize-none rounded-box border border-hairline bg-searchInput px-2.5 py-2 text-xs font-medium text-searchInputText outline-none placeholder:text-muted/60 focus:border-[#465D73]"
      />
    </div>
  );
}
