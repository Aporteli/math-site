'use client';

import { Send, UserCheck, X } from 'lucide-react';
import { AssignPagePicker } from './AssignPagePicker';
import { AssignCourseList } from './AssignCourseList';
import { AssignSendActions } from './AssignSendActions';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';

export function AssignBoardModal({ model }: { model: TeacherWhiteboardModel }) {
  const {
    assignError,
    assignedStatus,
    setAssignError,
    setIsAssignModalOpen,
  } = model;
  return (
        <div className="absolute inset-0 z-[150] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-in duration-150">
          <div className="flex max-h-[88vh] w-full max-w-xl animate-in flex-col overflow-hidden rounded-box border border-hairline bg-paper shadow-2xl zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-hairline bg-paper/30 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center text-brass-strong">
                  <Send className="size-7" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink leading-tight">დაფის გაგზავნა მოსწავლეებთან</h3>
                  <p className="text-[11px] text-muted">აირჩიეთ დაფები და ადრესატები კურსების მიხედვით</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setAssignError(null);
                }}
                className="flex size-7 cursor-pointer items-center justify-center text-muted transition-colors hover:text-loss">
                <X className="size-7" strokeWidth={2} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              <AssignPagePicker model={model} />
              <AssignCourseList model={model} />
              {assignedStatus && (
                <div className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-box border border-emerald-200">
                  <UserCheck className="size-4" />
                  <span>{assignedStatus}</span>
                </div>
              )}
              {assignError && (
                <div className="py-2 text-xs font-bold text-rose-600 text-center animate-in fade-in">
                  <span>{assignError}</span>
                </div>
              )}
            </div>
            <AssignSendActions model={model} />
          </div>
        </div>
  );
}
