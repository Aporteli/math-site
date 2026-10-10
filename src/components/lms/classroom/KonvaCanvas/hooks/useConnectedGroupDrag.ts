import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type Konva from 'konva';
import { findConnectedIds } from '../utils/connectivity';
import type { CanvasElement } from '../utils/types';

type DragEventHandler = (id: string, event: Konva.KonvaEventObject<DragEvent>) => void;

interface DragSnapshot {
  points?: number[];
  x: number;
  y: number;
}

interface UseConnectedGroupDragOptions {
  elementsRef: { current: CanvasElement[] };
  stageRef: RefObject<Konva.Stage | null>;
  onElementsChange: (elements: CanvasElement[]) => void;
  selectedImageId: string | undefined;
  handleDragStart: DragEventHandler;
  handleDragMove: DragEventHandler;
  handleDragEnd: DragEventHandler;
}

export function useConnectedGroupDrag({
  elementsRef,
  stageRef,
  onElementsChange,
  selectedImageId,
  handleDragStart,
  handleDragMove,
  handleDragEnd,
}: UseConnectedGroupDragOptions) {
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const dragSiblingsRef = useRef<Map<string, DragSnapshot>>(new Map());
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  /**
   * Drag start: snapshot every element in the connected group so we can move
   * siblings live during the drag and commit all of them on release.
   */
  const handleDragStartWrapped = useCallback(
    (id: string, event: Konva.KonvaEventObject<DragEvent>) => {
      if (id === selectedImageId) setIsDraggingImage(true);

      const connected = findConnectedIds(id, elementsRef.current);
      const snaps = new Map<string, DragSnapshot>();
      for (const el of elementsRef.current) {
        if (!connected.has(el.id)) continue;
        snaps.set(el.id, {
          points: el.points ? el.points.slice() : undefined,
          x: el.x ?? 0,
          y: el.y ?? 0,
        });
      }
      dragSiblingsRef.current = snaps;
      dragStartRef.current = { x: event.target.x(), y: event.target.y() };

      handleDragStart(id, event);
    },
    [elementsRef, handleDragStart, selectedImageId],
  );

  /**
   * Drag move: translate every sibling's Konva node by the same delta so the
   * connected figure moves as one rigid body during the drag. The dragged
   * node itself is moved by Konva.
   */
  const handleDragMoveWrapped = useCallback(
    (id: string, event: Konva.KonvaEventObject<DragEvent>) => {
      const snaps = dragSiblingsRef.current;
      const dx = event.target.x() - dragStartRef.current.x;
      const dy = event.target.y() - dragStartRef.current.y;

      if (snaps.size > 1 && (dx !== 0 || dy !== 0)) {
        const stage = stageRef.current;
        if (stage) {
          for (const [otherId, snap] of snaps) {
            if (otherId === id) continue;
            const node = stage.findOne('#' + otherId);
            if (!node) continue;

            if (snap.points) {
              // Line-like element: mutate points in place, keep transform identity.
              (node as Konva.Line).points(snap.points.map((v, i) => (i % 2 === 0 ? v + dx : v + dy)));
              node.x(0);
              node.y(0);
            } else {
              node.x(snap.x + dx);
              node.y(snap.y + dy);
            }
          }
          stage.batchDraw();
        }
      }

      handleDragMove(id, event);
    },
    [handleDragMove, stageRef],
  );

  /**
   * Drag end: commit new absolute positions for every sibling, then let the
   * base handler commit the dragged element (it reads e.target.x/y and bakes
   * the delta into that element's points).
   */
  const handleDragEndWrapped = useCallback(
    (id: string, event: Konva.KonvaEventObject<DragEvent>) => {
      const snaps = dragSiblingsRef.current;
      const dx = event.target.x() - dragStartRef.current.x;
      const dy = event.target.y() - dragStartRef.current.y;

      if (snaps.size > 1 && (dx !== 0 || dy !== 0)) {
        const updates = new Map<string, Partial<CanvasElement>>();
        for (const [otherId, snap] of snaps) {
          if (otherId === id) continue;
          if (snap.points) {
            updates.set(otherId, {
              points: snap.points.map((v, i) => (i % 2 === 0 ? v + dx : v + dy)),
              x: 0,
              y: 0,
            } as Partial<CanvasElement>);
          } else {
            updates.set(otherId, {
              x: snap.x + dx,
              y: snap.y + dy,
            } as Partial<CanvasElement>);
          }
        }

        if (updates.size > 0) {
          const next = elementsRef.current.map((el) => {
            const upd = updates.get(el.id);
            return upd ? ({ ...el, ...upd } as CanvasElement) : el;
          });
          onElementsChange(next);
        }
      }

      dragSiblingsRef.current = new Map();

      handleDragEnd(id, event);
      requestAnimationFrame(() => setIsDraggingImage(false));
    },
    [elementsRef, handleDragEnd, onElementsChange],
  );

  return {
    isDraggingImage,
    handleDragStartWrapped,
    handleDragMoveWrapped,
    handleDragEndWrapped,
  };
}
