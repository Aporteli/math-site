'use client';

import { useState } from 'react';
import { STORAGE_PREFS_KEY } from '../constants/storage';
import { DEFAULT_COLOR } from '../constants/colors';
import { type StylusButtonAction } from '../constants/stylus';
import { isStylusButtonAction } from '../utils/stylus';

function loadPrefs(): any {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PREFS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function useWhiteboardPrefs() {
  const [activeTool, setActiveTool] = useState<any>(() => loadPrefs().tool || 'pen');
  const [strokeColor, setStrokeColor] = useState<string>(() => loadPrefs().color || DEFAULT_COLOR);
  const [strokeWidth, setStrokeWidth] = useState<number>(() => loadPrefs().width || 2);
  const [eraserWidth, setEraserWidth] = useState<number>(() => {
    const p = loadPrefs();
    return typeof p.eraserWidth === 'number' ? p.eraserWidth : 40;
  });
  const [isDark, setIsDark] = useState<boolean>(() => !!loadPrefs().isDark);
  const [stylusOnly, setStylusOnly] = useState<boolean>(() => !!loadPrefs().stylusOnly);
  const [stylusPrimaryAction, setStylusPrimaryAction] = useState<StylusButtonAction>(() => {
    const p = loadPrefs();
    if (isStylusButtonAction(p.stylusPrimaryAction)) return p.stylusPrimaryAction;
    return 'temporary-eraser';
  });
  const [stylusSecondaryAction, setStylusSecondaryAction] = useState<StylusButtonAction>(() => {
    const p = loadPrefs();
    if (isStylusButtonAction(p.stylusSecondaryAction)) return p.stylusSecondaryAction;
    return 'none';
  });

  return {
    activeTool, setActiveTool,
    strokeColor, setStrokeColor,
    strokeWidth, setStrokeWidth,
    eraserWidth, setEraserWidth,
    isDark, setIsDark,
    stylusOnly, setStylusOnly,
    stylusPrimaryAction, setStylusPrimaryAction,
    stylusSecondaryAction, setStylusSecondaryAction,
  };
}