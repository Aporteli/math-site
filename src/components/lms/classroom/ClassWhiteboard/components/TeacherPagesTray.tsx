'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { BoardAssignmentMap } from '@/lib/livekit/board-assignment';
import type { CanvasElement } from '../../KonvaCanvas/utils/types';
import type { Student } from '../utils/types';
import { PagesTray } from './PagesTray';

interface Props {
  open: boolean;
  isTeacher: boolean;
  pagesTrayRef: RefObject<HTMLDivElement | null>;
  pages: CanvasElement[][];
  currentPageIndex: number;
  selectedPages: number[];
  isDark: boolean;
  students: Student[];
  assignedPageByStudent: BoardAssignmentMap;
  setIsPagesTrayOpen: Dispatch<SetStateAction<boolean>>;
  onSelectAll: () => void;
  onSwitchPage: (index: number) => void;
  onTogglePageSelect: (index: number) => void;
  setPendingDelete: Dispatch<SetStateAction<number[] | null>>;
  onAddNewPage: () => void;
}

export function TeacherPagesTray({
  open,
  isTeacher,
  pagesTrayRef,
  pages,
  currentPageIndex,
  selectedPages,
  isDark,
  students,
  assignedPageByStudent,
  setIsPagesTrayOpen,
  onSelectAll,
  onSwitchPage,
  onTogglePageSelect,
  setPendingDelete,
  onAddNewPage,
}: Props) {
  if (!open || !isTeacher) return null;
  return (
    <PagesTray
      ref={pagesTrayRef}
      pages={pages}
      currentPageIndex={currentPageIndex}
      selectedPages={selectedPages}
      isDark={isDark}
      assignedNames={pages.map((_, idx) =>
        students
          .filter((student) => assignedPageByStudent[student.identity] === idx)
          .map((student) => student.name),
      )}
      onClose={() => setIsPagesTrayOpen(false)}
      onSelectAll={onSelectAll}
      onSwitchPage={onSwitchPage}
      onTogglePageSelect={onTogglePageSelect}
      onDeletePage={(idx) => setPendingDelete([idx])}
      onDeleteSelectedPages={() => setPendingDelete(selectedPages)}
      onAddNewPage={onAddNewPage}
    />
  );
}
