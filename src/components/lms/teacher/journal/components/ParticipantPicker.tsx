'use client';

import { Check, ChevronDown, GraduationCap, Loader2, Search, User as UserIcon, Users, X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { ParticipantGroup, ParticipantOption, ParticipantRef } from '@/lib/actions/journal-participants';

interface ParticipantPickerProps {
  participants: ParticipantRef[];
  participantsOpen: boolean;
  setParticipantsOpen: Dispatch<SetStateAction<boolean>>;
  participantSearch: string;
  setParticipantSearch: Dispatch<SetStateAction<string>>;
  participantGroups: ParticipantGroup[];
  participantsLoading: boolean;
  isParticipantSelected: (id: string) => boolean;
  onToggleParticipant: (option: ParticipantOption) => void;
  onRemoveParticipant: (id: string) => void;
}

export function ParticipantPicker({
  participants,
  participantsOpen,
  setParticipantsOpen,
  participantSearch,
  setParticipantSearch,
  participantGroups,
  participantsLoading,
  isParticipantSelected,
  onToggleParticipant,
  onRemoveParticipant,
}: ParticipantPickerProps) {
  return (
    <div className="flex items-start gap-3">
      <GraduationCap className="mt-2 size-4 shrink-0 text-brass-strong" />
      <div className="flex-1 space-y-2">
        {participants.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {participants.map((p) => (
              <span
                key={p.id}
                className={`inline-flex items-center gap-1 rounded-box px-2.5 py-1 text-[11px] font-bold border ${
                  p.type === 'group' ? 'border-navy/20 bg-navy-tint text-navy' : 'border-win/20 bg-win-tint text-win'
                }`}>
                {p.type === 'group' ? <Users className="size-3" /> : <UserIcon className="size-3" />}
                <span className="truncate max-w-[140px]">{p.name}</span>
                {p.courseTitle && (
                  <span className="opacity-60 font-normal truncate max-w-[100px]">· {p.courseTitle}</span>
                )}
                <button type="button" onClick={() => onRemoveParticipant(p.id)} className="hover:text-rose-600">
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setParticipantsOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-between rounded-box border border-hairline bg-searchInput px-2.5 py-1.5 text-xs font-medium text-searchInputText transition-colors hover:border-[#465D73]">
          <span className="flex items-center gap-1.5 text-muted">
            <Search className="size-3" />
            მოსწავლის დამატება...
          </span>
          <ChevronDown className={`size-3.5 transition-transform ${participantsOpen ? 'rotate-180' : ''}`} />
        </button>

        {participantsOpen && (
          <div className="overflow-hidden rounded-box border border-hairline bg-main shadow-sm">
            <div className="p-1.5 border-b border-hairline/60">
              <input
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                placeholder="ძებნა..."
                className="w-full rounded-box border border-hairline bg-searchInput px-2 py-1 text-[11px] font-medium text-searchInputText outline-none focus:border-[#465D73]"
              />
            </div>

            <div className="max-h-56 overflow-y-auto thin-scrollbar">
              {participantsLoading ? (
                <div className="p-3 text-center text-xs text-muted">
                  <Loader2 className="size-3.5 animate-spin inline" />
                </div>
              ) : participantGroups.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted">მოსწავლეები ვერ მოიძებნა</div>
              ) : (
                participantGroups.map((g) => {
                  const filtered = g.students.filter((s) =>
                    s.name.toLowerCase().includes(participantSearch.toLowerCase()),
                  );
                  if (filtered.length === 0) return null;
                  return (
                    <div key={g.label} className="border-b border-hairline/60 last:border-b-0">
                      <div
                        className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                          g.type === 'group' ? 'bg-sectionHeader text-navy' : 'bg-win-tint text-win'
                        }`}>
                        {g.type === 'group' ? (
                          <Users className="size-3 inline mr-1" />
                        ) : (
                          <UserIcon className="size-3 inline mr-1" />
                        )}
                        {g.label}
                      </div>
                      {filtered.map((s) => {
                        const selected = isParticipantSelected(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => onToggleParticipant(s)}
                            className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs transition-colors ${
                              selected
                                ? 'bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08)]'
                                : 'text-ink hover:bg-sectionHeader'
                            }`}>
                            <span className="truncate">{s.name}</span>
                            {selected && <Check className="size-3.5 text-brass-strong shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
