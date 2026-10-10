import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type Konva from 'konva';
import type { CanvasElement } from '../utils/types';

interface UseImageToolbarPositionOptions {
  selectedImage: CanvasElement | null;
  activeTool: string;
  isCropping: boolean;
  disabled: boolean;
  isDraggingImage: boolean;
  elements: CanvasElement[];
  scale: number;
  stagePos: { x: number; y: number };
  stageRef: RefObject<Konva.Stage | null>;
}

export function useImageToolbarPosition({
  selectedImage,
  activeTool,
  isCropping,
  disabled,
  isDraggingImage,
  elements,
  scale,
  stagePos,
  stageRef,
}: UseImageToolbarPositionOptions) {
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- position is measured from Konva nodes after they commit */
    if (!selectedImage || activeTool !== 'select' || isCropping || disabled || isDraggingImage) {
      setToolbarPos(null);
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;
    const node = stage.findOne('#' + selectedImage.id);
    if (!node) {
      setToolbarPos(null);
      return;
    }
    const box = node.getClientRect({ skipStroke: true, skipShadow: true });
    const cx = box.x + box.width / 2;
    const above = box.y - 10;
    setToolbarPos({
      x: cx,
      y: above < 44 ? box.y + box.height + 10 : above,
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedImage, activeTool, isCropping, disabled, isDraggingImage, elements, scale, stagePos.x, stagePos.y, stageRef]);

  return toolbarPos;
}
