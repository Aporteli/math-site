import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type Konva from 'konva';
import type { CanvasElement } from '../utils/types';

interface UseDeleteButtonPositionOptions {
  selectedIds: string[];
  selectedImage: CanvasElement | null;
  activeTool: string;
  isCropping: boolean;
  disabled: boolean;
  elements: CanvasElement[];
  scale: number;
  stagePos: { x: number; y: number };
  stageRef: RefObject<Konva.Stage | null>;
}

export function useDeleteButtonPosition({
  selectedIds,
  selectedImage,
  activeTool,
  isCropping,
  disabled,
  elements,
  scale,
  stagePos,
  stageRef,
}: UseDeleteButtonPositionOptions) {
  const [deletePos, setDeletePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- position is measured from Konva nodes after they commit */
    if (activeTool !== 'select' || isCropping || disabled || selectedIds.length === 0 || selectedImage) {
      setDeletePos(null);
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of selectedIds) {
      const node = stage.findOne('#' + id);
      if (!node) continue;
      const box = node.getClientRect({ skipStroke: true, skipShadow: true });
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.width);
      maxY = Math.max(maxY, box.y + box.height);
    }
    if (!Number.isFinite(minX)) {
      setDeletePos(null);
      return;
    }
    const above = minY - 8;
    setDeletePos({
      x: (minX + maxX) / 2,
      y: above < 28 ? maxY + 8 : above,
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedIds, selectedImage, activeTool, isCropping, disabled, elements, scale, stagePos.x, stagePos.y, stageRef]);

  return deletePos;
}
