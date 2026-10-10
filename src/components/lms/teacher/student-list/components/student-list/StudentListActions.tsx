'use client';

import { UserPlus, Users } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { StudentRecord } from '../../studentList.types';

interface StudentListActionsProps {
  setEditingIndividual: Dispatch<SetStateAction<StudentRecord | null>>;
  setIndividualModalOpen: Dispatch<SetStateAction<boolean>>;
  setHomeGroupName: Dispatch<SetStateAction<string>>;
  setHomeGroupStudentIds: Dispatch<SetStateAction<string[]>>;
  setHomeGroupError: Dispatch<SetStateAction<string | null>>;
  setHomeGroupOpen: Dispatch<SetStateAction<boolean>>;
}

export function StudentListActions({
  setEditingIndividual,
  setIndividualModalOpen,
  setHomeGroupName,
  setHomeGroupStudentIds,
  setHomeGroupError,
  setHomeGroupOpen,
}: StudentListActionsProps) {
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setEditingIndividual(null);
          setIndividualModalOpen(true);
        }}
        title="ინდივიდუალური მოსწავლის დამატება"
        className="inline-flex min-h-10 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-box bg-[#A66A32] px-3 py-2 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_5px_rgba(166,106,50,0.22)] transition-all duration-200 hover:bg-[#B8783B] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_4px_12px_rgba(166,106,50,0.28)] active:scale-[0.98]">
        <UserPlus className="size-4 shrink-0" />
        <span className="truncate">სახლში</span>
      </button>
      <button
        type="button"
        onClick={() => {
          setHomeGroupName('');
          setHomeGroupStudentIds([]);
          setHomeGroupError(null);
          setHomeGroupOpen(true);
        }}
        title="სახლში მოსული მოსწავლეების ჯგუფი"
        className="inline-flex min-h-10 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-box bg-[#465D73] px-3 py-2 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)] active:scale-[0.98]">
        <Users className="size-4 shrink-0" />
        <span className="truncate">ჯგუფი</span>
      </button>
    </>
  );
}
