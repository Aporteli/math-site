//CUT დასაჭერელია

'use client';

import { useEffect, type RefObject } from 'react';
import { STORAGE_PREFS_KEY } from '../constants/storage';
import type { StylusButtonAction } from '../constants/stylus';

interface Options {
  isTemporaryEraserRef: RefObject<boolean>;
  previousToolRef: RefObject<any>;
  activeTool: any;
  strokeColor: string;
  strokeWidth: number;
  eraserWidth: number;
  isDark: boolean;
  stylusOnly: boolean;
  stylusPrimaryAction: StylusButtonAction;
  stylusSecondaryAction: StylusButtonAction;
}

export function usePersistPrefs(opts: Options) {
  const {
    isTemporaryEraserRef, previousToolRef,
    activeTool, strokeColor, strokeWidth, eraserWidth, isDark,
    stylusOnly, stylusPrimaryAction, stylusSecondaryAction,
  } = opts;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_PREFS_KEY,
        JSON.stringify({
          tool: isTemporaryEraserRef.current ? previousToolRef.current : activeTool,
          color: strokeColor,
          width: strokeWidth,
          eraserWidth,
          isDark,
          stylusOnly,
          stylusPrimaryAction,
          stylusSecondaryAction,
        }),
      );
    }
  }, [
    isTemporaryEraserRef, previousToolRef,
    activeTool, strokeColor, strokeWidth, eraserWidth, isDark,
    stylusOnly, stylusPrimaryAction, stylusSecondaryAction,
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefs = JSON.parse(localStorage.getItem(STORAGE_PREFS_KEY) || '{}');
      prefs.stylusOnly = stylusOnly;
      localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(prefs));
    }
  }, [stylusOnly]);
}