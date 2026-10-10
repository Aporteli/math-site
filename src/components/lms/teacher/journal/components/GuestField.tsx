'use client';

import { Plus, Users, X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

interface GuestFieldProps {
  guests: string[];
  guestDraft: string;
  setGuestDraft: Dispatch<SetStateAction<string>>;
  onAddGuest: () => void;
  onRemoveGuest: (name: string) => void;
}

export function GuestField({ guests, guestDraft, setGuestDraft, onAddGuest, onRemoveGuest }: GuestFieldProps) {
  return (
    <div className="flex items-start gap-3">
      <Users className="mt-2 size-4 shrink-0 text-brass-strong" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <input
            value={guestDraft}
            onChange={(e) => setGuestDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddGuest();
              }
            }}
            placeholder="დაამატეთ სტუმარი (თავისუფალი ტექსტი)..."
            className="flex-1 rounded-box border border-hairline bg-searchInput px-2.5 py-1.5 text-xs font-medium text-searchInputText outline-none placeholder:text-muted/60 focus:border-[#465D73]"
          />
          <button
            type="button"
            onClick={onAddGuest}
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-box border border-hairline bg-main text-icons transition-colors hover:bg-mainButtonHover hover:text-mainText">
            <Plus className="size-3.5" />
          </button>
        </div>
        {guests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {guests.map((g) => (
              <span
                key={g}
                className="inline-flex items-center gap-1 rounded-box border border-hairline bg-paper px-2.5 py-1 text-[11px] font-bold text-ink">
                {g}
                <button type="button" onClick={() => onRemoveGuest(g)} className="text-muted hover:text-rose-600">
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
