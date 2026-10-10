'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { CanvasElement } from '../../KonvaCanvas/utils/types';
import type { BoardView } from '../utils/types';

interface Options {
  isTeacher: boolean;
  canDraw: boolean;
  activeTool: string;
  setActiveTool: (tool: string) => void;
  setZoomScale: Dispatch<SetStateAction<number>>;
  setStagePos: Dispatch<SetStateAction<{ x: number; y: number }>>;
  assignedPageIndex: number | null;
  pagesRef: MutableRefObject<CanvasElement[][]>;
  setCurrentPageIndex: Dispatch<SetStateAction<number>>;
}

export function useLockedStudentView({
  isTeacher,
  canDraw,
  activeTool,
  setActiveTool,
  setZoomScale,
  setStagePos,
  assignedPageIndex,
  pagesRef,
  setCurrentPageIndex,
}: Options) {
  // Student-side: true while the teacher has locked this board to their view.
  const [isLocked, setIsLocked] = useState(false);

  const applyBoardView = useCallback(
    (view: BoardView) => {
      setZoomScale(view.scale);
      setStagePos({ x: view.x, y: view.y });
      if (assignedPageIndex !== null) return;
      if (Number.isInteger(view.pageIndex) && view.pageIndex >= 0 && view.pageIndex < pagesRef.current.length) {
        setCurrentPageIndex(view.pageIndex);
      }
    },
    [assignedPageIndex, pagesRef, setCurrentPageIndex, setStagePos, setZoomScale],
  );

  const drawGrantedRef = useRef(false);

  // Students pan with the hand tool until the teacher turns drawing on for them.
  useEffect(() => {
    if (isTeacher) return;
    if (!canDraw) {
      drawGrantedRef.current = false;
      if (activeTool !== 'hand') setActiveTool('hand');
      return;
    }
    if (!drawGrantedRef.current) {
      drawGrantedRef.current = true;
      if (activeTool === 'hand') setActiveTool('pen');
      return;
    }
    if (activeTool === 'laser') setActiveTool('pen');
  }, [isTeacher, canDraw, activeTool, setActiveTool]);

  return { isLocked, setIsLocked, applyBoardView };
}
