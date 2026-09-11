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
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[110] w-[340px] sm:w-[420px] rounded-3xl bg-white dark:bg-slate-900 p-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Send className="size-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">დაფის გაგზავნა</span>
        </div>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X className="size-4" />
        </button>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
            აირჩიეთ დაფები ({selectedPagesForAssign.length}):
          </span>
          <button type="button" onClick={onSelectAllPagesToggle} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
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
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
            აირჩიეთ მოსწავლეები ({selectedStudentIdentities.length}):
          </span>
          {students.length > 0 && (
            <button type="button" onClick={onSelectAllStudents} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              {selectedStudentIdentities.length === students.length ? 'მონიშვნის მოხსნა' : 'ყველა მოსწავლე'}
            </button>
          )}
        </div>

        {assignedStatus ? (
          <div className="flex items-center justify-center gap-2 py-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
            <UserCheck className="size-4" />
            <span>{assignedStatus}</span>
          </div>
        ) : assignError ? (
          <div className="flex flex-col items-center justify-center gap-1 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 text-center animate-in fade-in">
            <span>{assignError}</span>
          </div>
        ) : students.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-3">კურსზე მოსწავლეები არ არიან</p>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto p-1 custom-scrollbar">
            {students.map((student) => {
              const isChecked = selectedStudentIdentities.includes(student.identity);
              return (
                <button
                  key={student.identity}
                  type="button"
                  onClick={() => onToggleStudent(student.identity)}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all ${
                    isChecked
                      ? 'border-2 border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 shadow-xs'
                      : 'border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                  <span className="font-semibold truncate max-w-[240px]">{student.name || student.identity}</span>
                  <div className={`flex size-4 shrink-0 items-center justify-center rounded-md transition-all ${
                    isChecked ? 'bg-indigo-600 text-white' : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
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
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
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
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
          {assignPending && assignTargetType === 'material' ? (
            <><Loader2 className="size-3.5 animate-spin" /><span>იგზავნება...</span></>
          ) : (
            <><Layers className="size-3.5 text-indigo-400" /><span>მასალებში</span></>
          )}
        </button>
      </div>
    </div>
  );
}