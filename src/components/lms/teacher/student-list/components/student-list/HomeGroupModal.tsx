'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { StudentRecord } from '../../studentList.types';

interface HomeGroupModalProps {
  homeGroupSaving: boolean;
  setHomeGroupOpen: Dispatch<SetStateAction<boolean>>;
  homeGroupName: string;
  setHomeGroupName: Dispatch<SetStateAction<string>>;
  ungroupedHomeStudents: StudentRecord[];
  homeGroupStudentIds: string[];
  setHomeGroupStudentIds: Dispatch<SetStateAction<string[]>>;
  homeGroupError: string | null;
  onCreate: () => void;
}

export function HomeGroupModal({
  homeGroupSaving,
  setHomeGroupOpen,
  homeGroupName,
  setHomeGroupName,
  ungroupedHomeStudents,
  homeGroupStudentIds,
  setHomeGroupStudentIds,
  homeGroupError,
  onCreate,
}: HomeGroupModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-3 sm:items-center"
      onClick={() => {
        if (!homeGroupSaving) setHomeGroupOpen(false);
      }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-group-title"
        className="flex max-h-[min(88dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-box border border-hairline bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-hairline px-4 py-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-brass-strong">სახლში</p>
          <h2 id="home-group-title" className="mt-1 text-sm font-bold text-ink">
            სახლის ჯგუფი
          </h2>
          <p className="mt-1 text-[11px] font-medium leading-snug text-muted">
            ერთად მოსული მოსწავლეები კალენდარზე ერთ ჩანაწერად გამოჩნდებიან. გადახდები რჩება ცალ-ცალკე.
          </p>
        </div>
        <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold text-muted">სახელი</span>
            <input
              value={homeGroupName}
              onChange={(e) => setHomeGroupName(e.target.value)}
              placeholder="მაგ. სამშაბათის ჯგუფი"
              className="w-full rounded-box border border-hairline bg-searchInput px-3 py-2.5 text-sm font-bold text-searchInputText outline-none focus:border-navy"
            />
          </label>
          <div>
            <p className="mb-1.5 text-[10px] font-bold text-muted">მოსწავლეები</p>
            {ungroupedHomeStudents.length === 0 ? (
              <p className="rounded-box border border-dashed border-hairline px-3 py-4 text-center text-xs text-muted">
                ჯგუფის გარეშე სახლის მოსწავლე არ არის
              </p>
            ) : (
              <div className="space-y-1">
                {ungroupedHomeStudents.map((student) => {
                  const checked = homeGroupStudentIds.includes(student.id);
                  return (
                    <label
                      key={student.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-box border px-3 py-2 text-xs font-bold transition-all duration-200 ${
                        checked
                          ? 'border-transparent bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08)]'
                          : 'border-hairline bg-sectionHeader text-mainText hover:bg-mainButtonHover'
                      }`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setHomeGroupStudentIds((current) =>
                            checked ? current.filter((id) => id !== student.id) : [...current, student.id],
                          );
                        }}
                        className="size-3.5 accent-[#465D73]"
                      />
                      <span className="truncate">
                        {student.firstName} {student.lastName}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          {homeGroupError ? <p className="text-xs font-bold text-loss">{homeGroupError}</p> : null}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-hairline px-4 py-3">
          <button
            type="button"
            disabled={homeGroupSaving}
            onClick={() => setHomeGroupOpen(false)}
            className="cursor-pointer rounded-box border border-hairline bg-surface px-3 py-2 text-xs font-bold text-ink transition-colors hover:bg-paper-deep disabled:opacity-50">
            გაუქმება
          </button>
          <button
            type="button"
            disabled={homeGroupSaving}
            onClick={onCreate}
            className="cursor-pointer rounded-box bg-[#A66A32] px-3 py-2 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_5px_rgba(166,106,50,0.22)] transition-all duration-200 hover:bg-[#B8783B] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
            შექმნა
          </button>
        </div>
      </div>
    </div>
  );
}
