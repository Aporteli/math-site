'use client';

import { createContext, useContext } from 'react';
import type { Student } from '../../ClassWhiteboard/utils/types';

export interface BoardControlContextValue {
  /** Enrolled students that are currently connected to the class. */
  presentStudents: Student[];
  /** Identities of students whose board is locked to the teacher's view. */
  lockedStudentIds: Set<string>;
  /** Lock/unlock the board view of a single student. */
  toggleStudentLock: (identity: string) => void;
}

export const BoardControlContext = createContext<BoardControlContextValue>({
  presentStudents: [],
  lockedStudentIds: new Set(),
  toggleStudentLock: () => {},
});

export const BoardControlContextProvider = BoardControlContext.Provider;

export function useBoardControlContext(): BoardControlContextValue {
  return useContext(BoardControlContext);
}
