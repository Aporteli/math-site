'use client';

import { useCallback, useEffect, useRef } from 'react';
import { COLORS } from './constants';
import { getStylusButtonFromKeyboard } from './stylusKeys';
import type { WhiteboardState } from './useWhiteboardState';
import type { WhiteboardPersistence } from './useWhiteboardPersistence';
import type { WhiteboardHistory } from './useWhiteboardHistory';

export function useWhiteboardInput(boardState: WhiteboardState, persistence: WhiteboardPersistence, history: WhiteboardHistory) {
  const {
    penMenuRef,
    selectMenuRef,
    eraserMenuRef,
    shapesMenuRef,
    colorMenuRef,
    stylusMenuRef,
    smoothMenuRef,
    pagesTrayRef,
    setActiveTool,
    setStrokeColor,
    setIsPenMenuOpen,
    setIsSelectMenuOpen,
    setIsEraserMenuOpen,
    setIsShapesMenuOpen,
    setIsColorMenuOpen,
    setIsStylusMenuOpen,
    setIsSmoothMenuOpen,
    setIsPagesTrayOpen,
    previousToolRef,
    isTemporaryEraserRef,
    temporaryEraserHoldersRef,
    stylusButtonHeldRef,
    activeToolRef,
    strokeColorRef,
    stylusPrimaryActionRef,
    stylusSecondaryActionRef,
    savePreferencesImmediately,
    undo,
    redo,
    addImage,
  } = { ...boardState, ...persistence, ...history };
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (eraserMenuRef.current && !eraserMenuRef.current.contains(target)) setIsEraserMenuOpen(false);
      if (penMenuRef.current && !penMenuRef.current.contains(target)) setIsPenMenuOpen(false);
      if (selectMenuRef.current && !selectMenuRef.current.contains(target)) setIsSelectMenuOpen(false);
      if (shapesMenuRef.current && !shapesMenuRef.current.contains(target)) setIsShapesMenuOpen(false);
      if (colorMenuRef.current && !colorMenuRef.current.contains(target)) setIsColorMenuOpen(false);
      if (stylusMenuRef.current && !stylusMenuRef.current.contains(target)) setIsStylusMenuOpen(false);
      if (smoothMenuRef.current && !smoothMenuRef.current.contains(target)) setIsSmoothMenuOpen(false);
      if (pagesTrayRef.current && !pagesTrayRef.current.contains(target)) {
        const el = target as HTMLElement;
        if (!el.closest?.('[data-tray-trigger]')) setIsPagesTrayOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (ev.target?.result) addImage(ev.target.result as string);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addImage]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const undoRef = useRef(undo);
  undoRef.current = undo;

  const applyStylusAction = useCallback(
    (buttonIndex: 1 | 2, state: 'down' | 'up') => {
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
        if (activeToolRef.current === 'eraser') {
          const restored = previousToolRef.current || 'pen';
          setActiveTool(restored);
          savePreferencesImmediately({ tool: restored });
        } else {
          previousToolRef.current = activeToolRef.current;
          setActiveTool('eraser');
          savePreferencesImmediately({ tool: 'eraser' });
        }
        return;
      }

      if (action === 'toggle-laser') {
        isTemporaryEraserRef.current = false;
        temporaryEraserHoldersRef.current.clear();
        if (activeToolRef.current === 'laser') {
          const restored = previousToolRef.current || 'pen';
          setActiveTool(restored);
          savePreferencesImmediately({ tool: restored });
        } else {
          previousToolRef.current = activeToolRef.current;
          setActiveTool('laser');
          savePreferencesImmediately({ tool: 'laser' });
        }
        return;
      }

      if (action === 'cycle-colors') {
        const palette = COLORS.map((c) => c.hex);
        const current = strokeColorRef.current;
        const idx = palette.indexOf(current);
        const next = palette[(idx + 1) % palette.length];
        setStrokeColor(next);
        savePreferencesImmediately({ color: next });
        return;
      }

      if (action === 'undo') {
        undoRef.current();
      }
    },
    [savePreferencesImmediately],
  );

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
      if (e.repeat) {
        e.preventDefault();
        return;
      }
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
  return { undoRef, applyStylusAction };
}

export type WhiteboardInput = ReturnType<typeof useWhiteboardInput>;
