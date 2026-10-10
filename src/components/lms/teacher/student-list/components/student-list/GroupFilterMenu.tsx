'use client';

import { ChevronDown } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { StudentGroup, StudentRecord } from '../../studentList.types';

interface GroupFilterMenuProps {
  showTodayOnly: boolean;
  activeGroupId: string | 'all';
  groups: StudentGroup[];
  students: StudentRecord[];
  groupMenuOpen: boolean;
  setGroupMenuOpen: Dispatch<SetStateAction<boolean>>;
  setActiveGroupId: Dispatch<SetStateAction<string | 'all'>>;
  setShowTodayOnly: Dispatch<SetStateAction<boolean>>;
}

export function GroupFilterMenu({
  showTodayOnly,
  activeGroupId,
  groups,
  students,
  groupMenuOpen,
  setGroupMenuOpen,
  setActiveGroupId,
  setShowTodayOnly,
}: GroupFilterMenuProps) {
  return (
    <div className="relative w-fit max-w-full">
      <button
        type="button"
        onClick={() => setGroupMenuOpen((open) => !open)}
        className="inline-flex h-8 max-w-full cursor-pointer items-center justify-between gap-1.5 rounded-box border border-hairline bg-searchInput px-2.5 text-[11px] font-bold text-searchInputText transition-all duration-200 hover:border-navy">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate">
            {showTodayOnly
              ? 'დღეს'
              : activeGroupId === 'all'
                ? 'ყველა'
                : (groups.find((g) => g.id === activeGroupId)?.name ?? 'ყველა')}
          </span>
        </span>
        <ChevronDown className={`size-3 shrink-0 text-muted transition-transform ${groupMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      {groupMenuOpen ? (
        <>
          <button
            type="button"
            aria-label="დახურვა"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setGroupMenuOpen(false)}
          />
          <div className="absolute left-0 top-full z-20 mt-1 max-h-52 w-max min-w-full max-w-[16rem] overflow-y-auto rounded-box border border-hairline bg-main p-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
            <button
              type="button"
              onClick={() => {
                setActiveGroupId('all');
                setShowTodayOnly(false);
                setGroupMenuOpen(false);
              }}
              className={`flex w-full cursor-pointer items-center rounded-box px-2 py-1.5 text-left text-[11px] font-bold transition-all duration-200 ${
                activeGroupId === 'all' && !showTodayOnly
                  ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                  : 'text-mainText hover:bg-sectionHeader'
              }`}>
              ყველა
            </button>
            <button
              type="button"
              onClick={() => {
                setShowTodayOnly(true);
                setGroupMenuOpen(false);
              }}
              className={`flex w-full cursor-pointer items-center rounded-box px-2 py-1.5 text-left text-[11px] font-bold transition-all duration-200 ${
                showTodayOnly
                  ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                  : 'text-mainText hover:bg-sectionHeader'
              }`}>
              დღეს
            </button>
            {groups.map((g) => {
              const active = activeGroupId === g.id && !showTodayOnly;
              const count = students.filter((s) => s.groupIds.includes(g.id)).length;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setActiveGroupId(g.id);
                    setShowTodayOnly(false);
                    setGroupMenuOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-box px-2 py-1.5 text-left text-[11px] font-bold transition-all duration-200 ${
                    active
                      ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                      : g.home
                        ? 'text-brass-strong hover:bg-brass-tint'
                        : 'text-mainText hover:bg-sectionHeader'
                  }`}>
                  <span className="flex min-w-0 items-center gap-1.5">
                    {g.home ? <span className="text-[9px] font-bold uppercase">სახლში</span> : null}
                    <span className="truncate">{g.name}</span>
                  </span>
                  <span className={`rounded-box px-1.5 py-0.5 text-[9px] font-bold ${active ? 'text-mainText' : 'text-muted'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
