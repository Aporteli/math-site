import { useRef } from 'react';
import Konva from 'konva';
import type { CanvasElement } from '../utils/types';
import { findConnectedIds } from '../utils/connectivity';

interface Snapshot {
  points?: number[];
  x: number;
  y: number;
}

/**
 * Drag handlers that keep connected strokes moving together.
 *
 * Usage:
 *   const drag = useConnectedShapeDrag(elementsRef, onElementsChange, getNodeById);
 *
 *   <Line
 *     onDragStart={drag.onDragStart(el.id)}
 *     onDragMove={drag.onDragMove(el.id)}
 *     onDragEnd={drag.onDragEnd(el.id)}
 *   />
 *
 * `getNodeById(id)` must return the Konva node for that element so siblings
 * can be moved live during the drag. If you don't have one, keep a
 * `Map<string, Konva.Node>` populated whenever you mount/unmount shapes.
 */
export function useConnectedShapeDrag(
  elementsRef: React.MutableRefObject<CanvasElement[]>,
  onElementsChange: (els: CanvasElement[]) => void,
  getNodeById: (id: string) => Konva.Node | undefined,
) {
  const snapsRef = useRef<Map<string, Snapshot>>(new Map());
  const startRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const onDragStart =
    (id: string) => (e: Konva.KonvaEventObject<DragEvent>) => {
      const connected = findConnectedIds(id, elementsRef.current);
      const snaps = new Map<string, Snapshot>();
      for (const el of elementsRef.current) {
        if (!connected.has(el.id)) continue;
        snaps.set(el.id, {
          points: el.points ? el.points.slice() : undefined,
          x: (el as any).x ?? 0,
          y: (el as any).y ?? 0,
        });
      }
      snapsRef.current = snaps;
      startRef.current = { x: e.target.x(), y: e.target.y() };
    };

  const onDragMove =
    (id: string) => (e: Konva.KonvaEventObject<DragEvent>) => {
      const snaps = snapsRef.current;
      if (snaps.size <= 1) return;

      const dx = e.target.x() - startRef.current.x;
      const dy = e.target.y() - startRef.current.y;

      for (const [otherId, snap] of snaps) {
        if (otherId === id) continue;
        const node = getNodeById(otherId);
        if (!node) continue;

        if (snap.points) {
          // Line-like: authored as absolute world coords, node transform is identity.
          (node as any).points(
            snap.points.map((v, i) => (i % 2 === 0 ? v + dx : v + dy)),
          );
          node.x(0);
          node.y(0);
        } else {
          node.x(snap.x + dx);
          node.y(snap.y + dy);
        }
      }
      e.target.getLayer()?.batchDraw();
    };

  const onDragEnd =
    (id: string) => (e: Konva.KonvaEventObject<DragEvent>) => {
      const snaps = snapsRef.current;
      const dx = e.target.x() - startRef.current.x;
      const dy = e.target.y() - startRef.current.y;

      // Reset the dragged node's transform — the element now owns position.
      e.target.x(0);
      e.target.y(0);

      const next = elementsRef.current.map((el) => {
        const snap = snaps.get(el.id);
        if (!snap) return el;

        if (snap.points) {
          return {
            ...el,
            points: snap.points.map((v, i) => (i % 2 === 0 ? v + dx : v + dy)),
            x: 0,
            y: 0,
          } as CanvasElement;
        }
        return { ...el, x: snap.x + dx, y: snap.y + dy } as CanvasElement;
      });

      elementsRef.current = next;
      onElementsChange(next);
      snapsRef.current = new Map();
    };

  return { onDragStart, onDragMove, onDragEnd };
}