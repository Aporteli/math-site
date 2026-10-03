//CUT დასაჭერელია

'use client';

import { BookOpen, Check, Layers, Loader2, Send, UserCheck, X } from 'lucide-react';
import { AssignBoardThumbnail } from './AssignBoardThumbnail';
import type { CanvasElement } from '../../KonvaCanvas/utils/types';
import type { Student } from '../utils/types';

interface Props {
  pages: CanvasElement[][];
  isDark: boolean;
  currentPageIndex: number;
  students: Student[];
  selectedPagesForAssign: number[];
  selectedStudentIdentities: string[];
  assignedStatus: string | null;
  assignError: string | null;
  assignPending: boolean;
  assignTargetType: 'task' | 'material' | null;
  onClose: () => void;
  onTogglePage: (idx: number) => void;
  onSelectAllPagesToggle: () => void;
  onToggleStudent: (identity: string) => void;
  onSelectAllStudents: () => void;
  onAssign: (mode: 'task' | 'material') => void;
}

export function AssignModal({
  pages, isDark, currentPageIndex, students,
  selectedPagesForAssign, selectedStudentIdentities,
  assignedStatus, assignError, assignPending, assignTargetType,
  onClose, onTogglePage, onSelectAllPagesToggle, onToggleStudent,
  onSelectAllStudents, onAssign,
}: Props) {
  return (
    <div className="absolute bottom-16 left-1/2 z-[110] w-[340px] -translate-x-1/2 animate-in rounded-box border border-hairline bg-main p-4 shadow-[0_8px_24px_rgba(0,0,0,0.12)] fade-in zoom-in-95 duration-150 sm:w-[420px]">
      <div className="mb-2.5 flex items-center justify-between border-b border-hairline pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-box bg-brass-tint text-brass-strong">
            <Send className="size-3.5" />
          </div>
          <span className="text-xs font-bold text-ink">დაფის გაგზავნა</span>
        </div>
        <button type="button" onClick={onClose} className="cursor-pointer text-muted transition-colors hover:text-mainText">
          <X className="size-4" />
        </button>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <span className="text-[11px] font-bold text-muted">
            აირჩიეთ დაფები ({selectedPagesForAssign.length}):
          </span>
          <button type="button" onClick={onSelectAllPagesToggle} className="cursor-pointer text-[10px] font-bold text-navy hover:underline">
            {selectedPagesForAssign.length === pages.length ? 'მხოლოდ მიმდინარე' : 'ყველა დაფა'}
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 px-0.5 custom-scrollbar">
          {pages.map((pageElems, idx) => (
            <AssignBoardThumbnail
              key={idx}
              pageIndex={idx}
              elements={pageElems}
              isSelected={selectedPagesForAssign.includes(idx)}
              isDark={isDark}
              onToggle={() => onTogglePage(idx)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5 mb-3.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[11px] font-bold text-muted">
            აირჩიეთ მოსწავლეები ({selectedStudentIdentities.length}):
          </span>
          {students.length > 0 && (
            <button type="button" onClick={onSelectAllStudents} className="cursor-pointer text-[10px] font-bold text-navy hover:underline">
              {selectedStudentIdentities.length === students.length ? 'მონიშვნის მოხსნა' : 'ყველა მოსწავლე'}
            </button>
          )}
        </div>

        {assignedStatus ? (
          <div className="flex items-center justify-center gap-2 rounded-box border border-win/20 bg-win-tint py-3 text-xs font-bold text-win">
            <UserCheck className="size-4" />
            <span>{assignedStatus}</span>
          </div>
        ) : assignError ? (
          <div className="flex animate-in flex-col items-center justify-center gap-1 py-2 text-center text-xs font-bold text-rose-500 fade-in">
            <span>{assignError}</span>
          </div>
        ) : students.length === 0 ? (
          <p className="py-3 text-center text-xs font-medium text-muted">კურსზე მოსწავლეები არ არიან</p>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto p-1 custom-scrollbar">
            {students.map((student) => {
              const isChecked = selectedStudentIdentities.includes(student.identity);
              return (
                <button
                  key={student.identity}
                  type="button"
                  onClick={() => onToggleStudent(student.identity)}
                  className={`flex cursor-pointer items-center justify-between rounded-box p-2.5 text-left text-xs font-bold transition-all duration-200 ${
                    isChecked
                      ? 'border border-transparent bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                      : 'border border-hairline bg-sectionHeader text-mainText hover:bg-mainButtonHover'
                  }`}>
                  <span className="font-semibold truncate max-w-[240px]">{student.name || student.identity}</span>
                  <div className={`flex size-4 shrink-0 items-center justify-center rounded-box transition-all ${
                    isChecked ? 'bg-[#465D73] text-white' : 'border border-hairline bg-main'
                  }`}>
                    {isChecked && <Check className="size-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={assignPending || selectedPagesForAssign.length === 0 || selectedStudentIdentities.length === 0}
          onClick={() => onAssign('task')}
          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-box bg-[#465D73] py-2.5 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
          {assignPending && assignTargetType === 'task' ? (
            <><Loader2 className="size-3.5 animate-spin" /><span>იგზავნება...</span></>
          ) : (
            <><BookOpen className="size-3.5" /><span>დავალებებში</span></>
          )}
        </button>

        <button
          type="button"
          disabled={assignPending || selectedPagesForAssign.length === 0 || selectedStudentIdentities.length === 0}
          onClick={() => onAssign('material')}
          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-box bg-[#A66A32] py-2.5 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_5px_rgba(166,106,50,0.22)] transition-all duration-200 hover:bg-[#B8783B] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
          {assignPending && assignTargetType === 'material' ? (
            <><Loader2 className="size-3.5 animate-spin" /><span>იგზავნება...</span></>
          ) : (
            <><Layers className="size-3.5" /><span>მასალებში</span></>
          )}
        </button>
      </div>
    </div>
  );
}