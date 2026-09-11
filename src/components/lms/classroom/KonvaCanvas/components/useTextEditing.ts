import { useCallback, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { CanvasElement } from '../utils/types';
import { cleanPastedText } from '../utils/text';

interface UseTextEditingOptions {
  elementsRef: MutableRefObject<CanvasElement[]>;
  onElementsChange: (elements: CanvasElement[], options?: { commitHistory?: boolean }) => void;
  scale: number;
  stagePos: { x: number; y: number };
  setSelectedId: (id: string | null) => void;
}

export function useTextEditing({
  elementsRef,
  onElementsChange,
  scale,
  stagePos,
  setSelectedId,
}: UseTextEditingOptions) {
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState('');
  const [currentFontSize, setCurrentFontSize] = useState(24);
  const [editingPos, setEditingPos] = useState<{ x: number; y: number; width: number }>({
    x: 0,
    y: 0,
    width: 550,
  });
  const textareaInputRef = useRef<HTMLTextAreaElement>(null);

  const finishTextEditing = useCallback(() => {
    if (!editingTextId) return;
    const val = cleanPastedText(editingTextValue);

    let finalWidth = editingPos.width / (scale || 1);
    if (textareaInputRef.current) {
      finalWidth = Math.max(140, textareaInputRef.current.offsetWidth / (scale || 1));
    }

    if (!val) {
      const remaining = elementsRef.current.filter((el) => el.id !== editingTextId);
      elementsRef.current = remaining;
      onElementsChange(remaining);
      setSelectedId(null);
    } else {
      const updated = elementsRef.current.map((el) =>
        el.id === editingTextId ? { ...el, text: val, fontSize: currentFontSize, width: finalWidth } : el,
      );
      elementsRef.current = updated;
      onElementsChange(updated);
    }
    setEditingTextId(null);
    setEditingTextValue('');
  }, [
    editingTextId,
    editingTextValue,
    currentFontSize,
    editingPos.width,
    scale,
    onElementsChange,
    elementsRef,
    setSelectedId,
  ]);

  const startTextInlineEditing = useCallback(
    (el: CanvasElement) => {
      const stageScale = scale || 1;
      setEditingTextId(el.id);
      setEditingTextValue(el.text || '');
      setCurrentFontSize(el.fontSize || 24);
      const renderWidth = (el.width || 550) * stageScale;

      setEditingPos({
        x: (el.x || 50) * stageScale + stagePos.x,
        y: (el.y || 50) * stageScale + stagePos.y,
        width: Math.max(300, renderWidth),
      });

      setTimeout(() => {
        if (textareaInputRef.current) {
          textareaInputRef.current.focus();
          textareaInputRef.current.select();
        }
      }, 30);
    },
    [scale, stagePos],
  );

  const updateFontSize = useCallback(
    (s: number) => {
      setCurrentFontSize(s);
      onElementsChange(
        elementsRef.current.map((el) => (el.id === editingTextId ? { ...el, fontSize: s } : el)),
      );
    },
    [editingTextId, elementsRef, onElementsChange],
  );

  return {
    editingTextId,
    editingTextValue,
    setEditingTextValue,
    currentFontSize,
    editingPos,
    textareaInputRef,
    finishTextEditing,
    startTextInlineEditing,
    updateFontSize,
  };
}