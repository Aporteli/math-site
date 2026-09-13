//CUT

import { useCallback, useLayoutEffect, useRef } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import Konva from 'konva';
import type { CanvasElement } from '../utils/types';

interface UseElementTransformOptions {
  elementsRef: MutableRefObject<CanvasElement[]>;
  onElementsChange: (elements: CanvasElement[], options?: { commitHistory?: boolean }) => void;
  selectedIds: string[];
  trRef: RefObject<Konva.Transformer | null>;
}

interface GroupDragContext {
  /** Each selected element's Konva position at drag start. */
  start: Map<string, { x: number; y: number }>;
  /** Anchor node's Konva position at drag start. */
  origin: { x: number; y: number };
  /** Only the anchor's drag events drive the group. */
  anchorId: string;
  /** Latest drag delta in Konva coordinates. */
  dx: number;
  dy: number;
  /** The stage, cached so the layout effect can find nodes. */
  stage: Konva.Stage;
}

/** Bakes a Konva node's scale/rotation/position back into the persisted element. */
function bakeNodeTransform(node: any, el: CanvasElement): CanvasElement {
  const scaleX = node.scaleX();
  const scaleY = node.scaleY();
  const rotation = node.rotation();

  if (el.type === 'image') {
    // Images render as a Group positioned at their *center* (the inner image
    // is offset by -width/2, -height/2), but the persisted element's x/y is
    // the top-left corner. `node.x()`/`node.y()` return the center, so we must
    // subtract half the (new) size to keep the image from drifting down-right
    // on every drag/transform.
    const newWidth = Math.max(20, (el.width || 100) * scaleX);
    const newHeight = Math.max(20, (el.height || 100) * scaleY);
    node.scaleX(1);
    node.scaleY(1);
    return {
      ...el,
      x: node.x() - newWidth / 2,
      y: node.y() - newHeight / 2,
      rotation,
      width: newWidth,
      height: newHeight,
    };
  }
  if (el.type === 'text') {
    const newWidth = Math.max(80, (el.width || 550) * scaleX);
    node.scaleX(1);
    node.scaleY(1);
    return { ...el, x: node.x(), y: node.y(), rotation, width: newWidth, scaleX: 1, scaleY: 1 };
  }
  if (el.type === 'rect') {
    const newW = Math.max(5, (el.width || 10) * scaleX);
    const newH = Math.max(5, (el.height || 10) * scaleY);
    node.scaleX(1);
    node.scaleY(1);
    return { ...el, x: node.x(), y: node.y(), rotation, width: newW, height: newH, scaleX: 1, scaleY: 1 };
  }
  if (el.type === 'circle' || el.type === 'star') {
    const newRad = Math.max(5, (el.radius || 10) * Math.max(scaleX, scaleY));
    node.scaleX(1);
    node.scaleY(1);
    return { ...el, x: node.x(), y: node.y(), rotation, radius: newRad, scaleX: 1, scaleY: 1 };
  }
  if (
    el.type === 'freedraw' ||
    el.type === 'line' ||
    el.type === 'arrow' ||
    el.type === 'triangle' ||
    el.type === 'diamond'
  ) {
    const pts = el.points || [];
    const newPoints: number[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      newPoints.push(pts[i] * scaleX, pts[i + 1] * scaleY);
    }
    node.scaleX(1);
    node.scaleY(1);
    return { ...el, x: node.x(), y: node.y(), rotation, points: newPoints, scaleX: 1, scaleY: 1 };
  }
  return { ...el, x: node.x(), y: node.y(), rotation };
}

export function useElementTransform({
  elementsRef,
  onElementsChange,
  selectedIds,
  trRef,
}: UseElementTransformOptions) {
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  // Stable ref so handler identities never depend on the parent's callback.
  const onElementsChangeRef = useRef(onElementsChange);
  onElementsChangeRef.current = onElementsChange;

  const groupDragRef = useRef<GroupDragContext | null>(null);

  /**
   * After every render, if a multi-drag is active, re-apply the drag delta to
   * all selected nodes. This defends against any parent re-render (LiveKit
   * events, selection changes, timers) that causes react-konva to re-apply
   * the stale `x`/`y` props from state and snap the group back mid-drag.
   *
   * It runs on every render (no deps array), but bails out immediately when
   * no drag is in progress, so the cost is one null check per render.
   */
  useLayoutEffect(() => {
    const ctx = groupDragRef.current;
    if (!ctx) return;

    for (const [id, start] of ctx.start) {
      const node = ctx.stage.findOne('#' + id);
      if (!node) continue;
      if (id === ctx.anchorId) continue; // Konva drives the anchor itself
      node.position({ x: start.x + ctx.dx, y: start.y + ctx.dy });
    }
  });

  const handleDragStart = useCallback((id: string, e: any) => {
    groupDragRef.current = null;

    const selected = selectedIdsRef.current;
    if (selected.length < 2 || !selected.includes(id)) return;

    const stage = e.target.getStage();
    if (!stage) return;

    // Read start positions from KONVA NODES. Using the same coordinate
    // space for start + delta + commit means we never accumulate drift
    // across the drag.
    const start = new Map<string, { x: number; y: number }>();
    for (const sid of selected) {
      const node = stage.findOne('#' + sid);
      if (node) start.set(sid, { x: node.x(), y: node.y() });
    }

    groupDragRef.current = {
      start,
      origin: { x: e.target.x(), y: e.target.y() },
      anchorId: id,
      dx: 0,
      dy: 0,
      stage,
    };
  }, []);

  const handleDragMove = useCallback((_id: string, e: any) => {
    const ctx = groupDragRef.current;
    if (!ctx) return;
    if (e.target.id() !== ctx.anchorId) return;

    // Record the latest delta for the layout effect and for dragend.
    ctx.dx = e.target.x() - ctx.origin.x;
    ctx.dy = e.target.y() - ctx.origin.y;

    // Move the non-anchor nodes imperatively. NO setState here — updating
    // React state on every dragmove causes react-konva to re-apply the
    // position props, which re-fires dragmove and produces the
    // "Maximum update depth exceeded" loop.
    for (const [sid, start] of ctx.start) {
      if (sid === ctx.anchorId) continue;
      const node = ctx.stage.findOne('#' + sid);
      if (node) node.position({ x: start.x + ctx.dx, y: start.y + ctx.dy });
    }
  }, []);

  const handleDragEnd = useCallback(
    (id: string, e: any) => {
      const ctx = groupDragRef.current;

      if (ctx) {
        if (id !== ctx.anchorId) return;
        groupDragRef.current = null;

        const { dx, dy } = ctx;

        // Single atomic commit — every selected element moves together,
        // producing exactly one history entry and one broadcast packet.
        const updated = elementsRef.current.map((el) => {
          const start = ctx.start.get(el.id);
          if (!start) return el;
          const nextX = start.x + dx;
          const nextY = start.y + dy;
          // Images track the Group node whose position is the visual *center*,
          // whereas el.x/el.y is the top-left corner — convert back so a
          // multi-select drag doesn't offset images down-right.
          if (el.type === 'image') {
            const w = el.width || 100;
            const h = el.height || 100;
            return { ...el, x: nextX - w / 2, y: nextY - h / 2 };
          }
          return { ...el, x: nextX, y: nextY };
        });

        onElementsChangeRef.current(updated);
        trRef.current?.forceUpdate();
        return;
      }

      // Late dragend from a non-anchor selected node — ignore.
      if (selectedIdsRef.current.length >= 2 && selectedIdsRef.current.includes(id)) {
        return;
      }

      // Genuine single-element drag.
      const updated = elementsRef.current.map((el) =>
        el.id === id ? bakeNodeTransform(e.target, el) : el,
      );
      onElementsChangeRef.current(updated);
    },
    [elementsRef, trRef],
  );

  const handleTransformEnd = useCallback(
    (_e: any) => {
      const nodes: any[] = trRef.current?.nodes() ?? [];
      if (nodes.length === 0) return;

      const nodesById = new Map<string, any>();
      for (const node of nodes) nodesById.set(node.id(), node);

      const updated = elementsRef.current.map((el) => {
        const node = nodesById.get(el.id);
        return node ? bakeNodeTransform(node, el) : el;
      });
      onElementsChangeRef.current(updated);
    },
    [elementsRef, trRef],
  );

  return { handleDragStart, handleDragMove, handleDragEnd, handleTransformEnd };
}