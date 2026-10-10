'use client';

import { useCallback, useEffect } from 'react';
import { DEFAULT_COLOR, DARK_COLORS, LIGHT_COLOR } from './constants';
import { capHistory } from './pageHistory';
import type { CanvasElement } from '@/components/lms/classroom/KonvaCanvas/utils/types';
import type { WhiteboardState } from './useWhiteboardState';
import type { WhiteboardPersistence } from './useWhiteboardPersistence';

export function useWhiteboardHistory(boardState: WhiteboardState, persistence: WhiteboardPersistence) {
  const {
    setPages,
    setActiveTool,
    isDark,
    schedulePushRef,
    scheduleLocalPagesSaveRef,
    pagesRef,
    currentPageIndexRef,
    historyMapRef,
    savePreferencesImmediately,
    updateUndoRedoState,
    scheduleLocalPagesSave,
  } = { ...boardState, ...persistence };
  const handleElementsChange = useCallback(
    (next: CanvasElement[], options?: { commitHistory?: boolean; publish?: boolean }) => {
      const pIndex = currentPageIndexRef.current;
      const updated = [...pagesRef.current];
      updated[pIndex] = next;
      setPages(updated);
      pagesRef.current = updated;

      if (options?.publish !== false) schedulePushRef.current();

      if (options?.commitHistory !== false) {
        let hist = historyMapRef.current.get(pIndex);
        if (!hist) {
          hist = { states: [[]], index: 0 };
        }
        const nextStates = hist.states.slice(0, hist.index + 1);
        nextStates.push(next);
        historyMapRef.current.set(pIndex, capHistory(nextStates, nextStates.length - 1));
        updateUndoRedoState();
      }
    },
    [updateUndoRedoState],
  );

  const undo = useCallback(() => {
    const pIndex = currentPageIndexRef.current;
    const hist = historyMapRef.current.get(pIndex);
    if (!hist || hist.index <= 0) return;
    hist.index -= 1;
    const targetElements = hist.states[hist.index];
    const updated = [...pagesRef.current];
    updated[pIndex] = targetElements;
    setPages(updated);
    pagesRef.current = updated;
    scheduleLocalPagesSave();
    schedulePushRef.current();
    updateUndoRedoState();
  }, [scheduleLocalPagesSave, updateUndoRedoState]);

  const redo = useCallback(() => {
    const pIndex = currentPageIndexRef.current;
    const hist = historyMapRef.current.get(pIndex);
    if (!hist || hist.index >= hist.states.length - 1) return;
    hist.index += 1;
    const targetElements = hist.states[hist.index];
    const updated = [...pagesRef.current];
    updated[pIndex] = targetElements;
    setPages(updated);
    pagesRef.current = updated;
    scheduleLocalPagesSave();
    schedulePushRef.current();
    updateUndoRedoState();
  }, [scheduleLocalPagesSave, updateUndoRedoState]);

  // --- 🌟 Smart theme conversion for existing elements ---
  useEffect(() => {
    const darkColors = DARK_COLORS; // ['#1e293b', '#000000']
    const lightColor = LIGHT_COLOR; // '#ffffff'
    let updated = false;

    const newPages = pagesRef.current.map((page) =>
      page.map((el) => {
        if (isDark) {
          // In dark mode: convert any dark default colour to white
          if (darkColors.includes(el.stroke)) {
            updated = true;
            return { ...el, stroke: lightColor };
          }
        } else {
          // In light mode: convert white (that came from conversion) back to default
          if (el.stroke === lightColor) {
            updated = true;
            return { ...el, stroke: DEFAULT_COLOR };
          }
        }
        return el;
      }),
    );

    if (updated) {
      setPages(newPages);
      pagesRef.current = newPages;

      // Update history for the current page
      const pIndex = currentPageIndexRef.current;
      const hist = historyMapRef.current.get(pIndex);
      if (hist) {
        const nextStates = hist.states.slice(0, hist.index + 1);
        nextStates.push(newPages[pIndex]);
        historyMapRef.current.set(pIndex, capHistory(nextStates, nextStates.length - 1));
        updateUndoRedoState();
      }

      scheduleLocalPagesSaveRef.current();
    }
  }, [isDark, updateUndoRedoState]);

  const addImage = useCallback(
    (dataUrl: string, pos?: { x: number; y: number }) => {
      const img = new window.Image();
      img.src = dataUrl;
      img.onload = () => {
        const maxW = 450;
        const maxH = 450;
        let w = img.width || 300;
        let h = img.height || 200;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const elem: CanvasElement = {
          id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'image',
          x: pos ? pos.x : 100,
          y: pos ? pos.y : 100,
          width: w,
          height: h,
          src: dataUrl,
          stroke: 'transparent',
          strokeWidth: 0,
        };

        const currentElems = pagesRef.current[currentPageIndexRef.current] || [];
        handleElementsChange([...currentElems, elem]);
        setActiveTool('select');
        savePreferencesImmediately({ tool: 'select' });
      };
    },
    [handleElementsChange, savePreferencesImmediately],
  );
  return { handleElementsChange, undo, redo, addImage };
}

export type WhiteboardHistory = ReturnType<typeof useWhiteboardHistory>;
