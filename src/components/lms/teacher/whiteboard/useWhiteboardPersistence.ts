'use client';

import { useCallback, useEffect } from 'react';
import { PREFS_KEY, STORAGE_KEY_PAGES } from './constants';
import { stringifyPages } from './pageHistory';
import { isStylusButtonAction } from './stylusKeys';
import type { StylusButtonAction, ToolId } from './types';
import type { WhiteboardState } from './useWhiteboardState';

export function useWhiteboardPersistence(boardState: WhiteboardState) {
  const {
    setPages,
    currentPageIndex,
    setCurrentPageIndex,
    activeTool,
    setActiveTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    eraserWidth,
    setEraserWidth,
    isDark,
    setIsDark,
    stylusOnly,
    setStylusOnly,
    penSmoothEnabled,
    setPenSmoothEnabled,
    penSmoothIntensity,
    setPenSmoothIntensity,
    stylusPrimaryAction,
    setStylusPrimaryAction,
    stylusSecondaryAction,
    setStylusSecondaryAction,
    zoomScale,
    setZoomScale,
    setCanUndo,
    setCanRedo,
    isHydratedRef,
    scheduleLocalPagesSaveRef,
    pagesJsonRef,
    localPagesTimerRef,
    pagesRef,
    currentPageIndexRef,
    historyMapRef,
    previousToolRef,
    isTemporaryEraserRef,
  } = boardState;
  useEffect(() => {
    try {
      const prefsRaw = localStorage.getItem(PREFS_KEY);
      if (prefsRaw) {
        const p = JSON.parse(prefsRaw);
        if (p.tool) setActiveTool(p.tool);
        if (p.color) setStrokeColor(p.color);
        if (typeof p.width === 'number') setStrokeWidth(p.width);
        if (typeof p.eraserWidth === 'number') setEraserWidth(p.eraserWidth);
        if (typeof p.isDark === 'boolean') setIsDark(p.isDark);
        if (typeof p.stylusOnly === 'boolean') setStylusOnly(p.stylusOnly);
        if (isStylusButtonAction(p.stylusPrimaryAction)) setStylusPrimaryAction(p.stylusPrimaryAction);
        if (isStylusButtonAction(p.stylusSecondaryAction)) setStylusSecondaryAction(p.stylusSecondaryAction);
        if (typeof p.zoomScale === 'number') setZoomScale(p.zoomScale);
        if (typeof p.currentPageIndex === 'number') setCurrentPageIndex(p.currentPageIndex);
        if (typeof p.penSmoothEnabled === 'boolean') setPenSmoothEnabled(p.penSmoothEnabled);
        if (typeof p.penSmoothIntensity === 'number') setPenSmoothIntensity(p.penSmoothIntensity);
      }
      const pagesRaw = localStorage.getItem(STORAGE_KEY_PAGES);
      if (pagesRaw) {
        const parsed = JSON.parse(pagesRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPages(parsed);
          pagesRef.current = parsed;
          parsed.forEach((p, idx) => {
            historyMapRef.current.set(idx, { states: [p || []], index: 0 });
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      isHydratedRef.current = true;
    }
  }, []);

  const savePreferencesImmediately = useCallback(
    (updates: {
      tool?: ToolId;
      color?: string;
      width?: number;
      eraserWidth?: number;
      isDark?: boolean;
      zoomScale?: number;
      pageIdx?: number;
      stylusOnly?: boolean;
      stylusPrimaryAction?: StylusButtonAction;
      stylusSecondaryAction?: StylusButtonAction;
      penSmoothEnabled?: boolean;
      penSmoothIntensity?: number;
    }) => {
      if (typeof window === 'undefined' || !isHydratedRef.current) return;
      try {
        const raw = localStorage.getItem(PREFS_KEY);
        const current = raw ? JSON.parse(raw) : {};
        const next = {
          ...current,
          tool: isTemporaryEraserRef.current ? previousToolRef.current : (updates.tool ?? activeTool),
          color: updates.color ?? strokeColor,
          width: updates.width ?? strokeWidth,
          eraserWidth: updates.eraserWidth ?? eraserWidth,
          isDark: updates.isDark ?? isDark,
          zoomScale: updates.zoomScale ?? zoomScale,
          currentPageIndex: updates.pageIdx ?? currentPageIndex,
          stylusOnly: updates.stylusOnly ?? stylusOnly,
          stylusPrimaryAction: updates.stylusPrimaryAction ?? stylusPrimaryAction,
          stylusSecondaryAction: updates.stylusSecondaryAction ?? stylusSecondaryAction,
          penSmoothEnabled: updates.penSmoothEnabled ?? penSmoothEnabled,
          penSmoothIntensity: updates.penSmoothIntensity ?? penSmoothIntensity,
        };
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
    },
    [
      activeTool,
      strokeColor,
      strokeWidth,
      isDark,
      zoomScale,
      currentPageIndex,
      stylusOnly,
      stylusPrimaryAction,
      stylusSecondaryAction,
    ],
  );

  const updateUndoRedoState = useCallback(() => {
    const hist = historyMapRef.current.get(currentPageIndexRef.current);
    if (hist) {
      setCanUndo(hist.index > 0);
      setCanRedo(hist.index < hist.states.length - 1);
    } else {
      setCanUndo(false);
      setCanRedo(false);
    }
  }, []);

  const writeLocalPages = useCallback(() => {
    if (typeof window === 'undefined' || !isHydratedRef.current) return;
    try {
      const pages = pagesRef.current;
      const cached = pagesJsonRef.current;
      const json = cached && cached.pages === pages ? cached.json : stringifyPages(pages);
      if (!cached || cached.pages !== pages) pagesJsonRef.current = { pages, json };
      localStorage.setItem(STORAGE_KEY_PAGES, json);
    } catch {}
  }, []);

  const scheduleLocalPagesSave = useCallback(() => {
    if (typeof window === 'undefined' || !isHydratedRef.current) return;
    if (localPagesTimerRef.current != null) return;
    localPagesTimerRef.current = window.setTimeout(() => {
      localPagesTimerRef.current = null;
      writeLocalPages();
    }, 400);
  }, [writeLocalPages]);
  scheduleLocalPagesSaveRef.current = scheduleLocalPagesSave;

  useEffect(() => {
    const flush = () => {
      if (localPagesTimerRef.current != null) {
        window.clearTimeout(localPagesTimerRef.current);
        localPagesTimerRef.current = null;
      }
      writeLocalPages();
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      if (localPagesTimerRef.current != null) flush();
    };
  }, [writeLocalPages]);
  return { savePreferencesImmediately, updateUndoRedoState, writeLocalPages, scheduleLocalPagesSave };
}

export type WhiteboardPersistence = ReturnType<typeof useWhiteboardPersistence>;
