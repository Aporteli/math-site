//CUT დასაჭერელია

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { WHITEBOARD_COLORS } from '../constants/colors';
import type { StylusButtonAction } from '../constants/stylus';
import { getStylusButtonFromKeyboard } from '../utils/stylus';

interface Options {
  activeTool: any;
  setActiveTool: (tool: any) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  stylusPrimaryAction: StylusButtonAction;
  stylusSecondaryAction: StylusButtonAction;
  handleUndo: () => void;
}

export function useStylusActions(opts: Options) {
  const {
    activeTool, setActiveTool, strokeColor, setStrokeColor,
    stylusPrimaryAction, stylusSecondaryAction, handleUndo,
  } = opts;

  const previousToolRef = useRef<any>(activeTool === 'eraser' ? 'pen' : activeTool);
  const isTemporaryEraserRef = useRef(false);
  const temporaryEraserHoldersRef = useRef<Set<1 | 2>>(new Set());
  const stylusButtonHeldRef = useRef({ 1: false, 2: false });
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const stylusPrimaryActionRef = useRef(stylusPrimaryAction);
  stylusPrimaryActionRef.current = stylusPrimaryAction;
  const stylusSecondaryActionRef = useRef(stylusSecondaryAction);
  stylusSecondaryActionRef.current = stylusSecondaryAction;
  const strokeColorRef = useRef(strokeColor);
  strokeColorRef.current = strokeColor;
  const handleUndoRef = useRef(handleUndo);
  handleUndoRef.current = handleUndo;

  const applyStylusAction = useCallback((buttonIndex: 1 | 2, state: 'down' | 'up') => {
    if (state === 'down') {
      if (stylusButtonHeldRef.current[buttonIndex]) return;
      stylusButtonHeldRef.current[buttonIndex] = true;
    } else {
      if (!stylusButtonHeldRef.current[buttonIndex]) return;
      stylusButtonHeldRef.current[buttonIndex] = false;
    }

    const action = buttonIndex === 1 ? stylusPrimaryActionRef.current : stylusSecondaryActionRef.current;
    if (action === 'none') return;

    if (action === 'temporary-eraser') {
      if (state === 'down') {
        temporaryEraserHoldersRef.current.add(buttonIndex);
        if (!isTemporaryEraserRef.current) {
          const current = activeToolRef.current;
          if (current !== 'eraser') previousToolRef.current = current;
          isTemporaryEraserRef.current = true;
          setActiveTool('eraser');
        }
      } else {
        temporaryEraserHoldersRef.current.delete(buttonIndex);
        if (temporaryEraserHoldersRef.current.size === 0 && isTemporaryEraserRef.current) {
          isTemporaryEraserRef.current = false;
          setActiveTool(previousToolRef.current || 'pen');
        }
      }
      return;
    }

    if (state !== 'down') return;

    if (action === 'toggle-eraser') {
      isTemporaryEraserRef.current = false;
      temporaryEraserHoldersRef.current.clear();
      if (activeToolRef.current === 'eraser') setActiveTool(previousToolRef.current || 'pen');
      else { previousToolRef.current = activeToolRef.current; setActiveTool('eraser'); }
      return;
    }

    if (action === 'toggle-laser') {
      isTemporaryEraserRef.current = false;
      temporaryEraserHoldersRef.current.clear();
      if (activeToolRef.current === 'laser') setActiveTool(previousToolRef.current || 'pen');
      else { previousToolRef.current = activeToolRef.current; setActiveTool('laser'); }
      return;
    }

    if (action === 'cycle-colors') {
      const current = strokeColorRef.current;
      const idx = WHITEBOARD_COLORS.indexOf(current as (typeof WHITEBOARD_COLORS)[number]);
      setStrokeColor(WHITEBOARD_COLORS[(idx + 1) % WHITEBOARD_COLORS.length]);
      return;
    }

    if (action === 'undo') {
      handleUndoRef.current();
    }
  }, []);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const button = getStylusButtonFromKeyboard(e);
      if (!button) return;
      if (isTypingTarget(e.target) && e.keyCode !== 308 && e.keyCode !== 309) return;
      if (e.repeat) { e.preventDefault(); return; }
      e.preventDefault();
      e.stopPropagation();
      applyStylusAction(button, 'down');
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const button = getStylusButtonFromKeyboard(e);
      if (!button) return;
      e.preventDefault();
      e.stopPropagation();
      applyStylusAction(button, 'up');
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [applyStylusAction]);

  return { applyStylusAction, previousToolRef, isTemporaryEraserRef, activeToolRef };
}