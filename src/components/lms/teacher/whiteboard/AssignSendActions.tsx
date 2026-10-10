'use client';

import { Loader2, Layers, BookOpen } from 'lucide-react';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';

export function AssignSendActions({ model }: { model: TeacherWhiteboardModel }) {
  const {
    assignPending,
    assignTargetType,
    handleAssignSelectedBoards,
    selectedPagesForAssign,
    selectedStudentIds,
  } = model;
  return (
            <div className="border-t border-hairline bg-paper/30 p-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={assignPending || selectedPagesForAssign.length === 0 || selectedStudentIds.length === 0}
                onClick={() => handleAssignSelectedBoards('task')}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-box bg-[#465D73] py-2.5 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
                {assignPending && assignTargetType === 'task' ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>იგზავნება...</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="size-3.5" />
                    <span>დავალებებში</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={assignPending || selectedPagesForAssign.length === 0 || selectedStudentIds.length === 0}
                onClick={() => handleAssignSelectedBoards('material')}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-box bg-[#A66A32] py-2.5 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_5px_rgba(166,106,50,0.22)] transition-all duration-200 hover:bg-[#B8783B] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
                {assignPending && assignTargetType === 'material' ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>იგზავნება...</span>
                  </>
                ) : (
                  <>
                    <Layers className="size-3.5" />
                    <span>მასალებში</span>
                  </>
                )}
              </button>
            </div>
  );
}
