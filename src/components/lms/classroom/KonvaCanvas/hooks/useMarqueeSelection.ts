'use client';

import { useCallback, useRef, type MutableRefObject, type RefObject } from 'react';
import Konva from 'konva';
import type { CanvasElement } from '../utils/types';
import { aabbFromPoints, aabbIntersects, getElementAABB } from '../utils/aabb';

/** A drag smaller than this (in stage px) is treated as a click, not a selection. */
const MARQUEE_MIN_SIZE = 4;

interface Options {
  elementsRef: MutableRefObject<CanvasElement[]>;
  marqueeLayerRef: RefObject<Konva.Layer | null>;
  setSelectedIds: (ids: string[]) => void;
}

export function useMarqueeSelection({ elementsRef, marqueeLayerRef, setSelectedIds }: Options) {
  const rectRef = useRef<Konva.Rect | null>(null);
  const stateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    curX: 0,
    curY: 0,
  });

  const ensureRect = useCallback(() => {
    if (rectRef.current) return rectRef.current;
    const layer = marqueeLayerRef.current;
    if (!layer) return null;

    const rect = new Konva.Rect({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      fill: 'rgba(99, 102, 241, 0.15)',
      stroke: 'rgba(99, 102, 241, 0.9)',
      strokeWidth: 1,
      dash: [4, 4],
      listening: false,
      visible: false,
    });
    rectRef.current = rect;
    layer.add(rect);
    return rect;
  }, [marqueeLayerRef]);

  const startMarquee = useCallback(
    (pos: { x: number; y: number }) => {
      const rect = ensureRect();
      stateRef.current = { active: true, startX: pos.x, startY: pos.y, curX: pos.x, curY: pos.y };
      if (rect) {
        rect.visible(true);
        rect.position({ x: pos.x, y: pos.y });
        rect.size({ width: 0, height: 0 });
        rect.getLayer()?.batchDraw();
      }
    },
    [ensureRect],
  );

  const updateMarquee = useCallback((pos: { x: number; y: number }) => {
    const state = stateRef.current;
    if (!state.active) return;
    state.curX = pos.x;
    state.curY = pos.y;

    const rect = rectRef.current;
    if (!rect) return;

    const x = Math.min(state.startX, pos.x);
    const y = Math.min(state.startY, pos.y);
    rect.position({ x, y });
    rect.size({ width: Math.abs(pos.x - state.startX), height: Math.abs(pos.y - state.startY) });
    rect.getLayer()?.batchDraw();
  }, []);

  const endMarquee = useCallback(() => {
    const state = stateRef.current;
    if (!state.active) return;
    state.active = false;

    const rect = rectRef.current;
    if (rect) {
      rect.visible(false);
      rect.getLayer()?.batchDraw();
    }

    const w = Math.abs(state.curX - state.startX);
    const h = Math.abs(state.curY - state.startY);

    // Treat as a click on empty space → deselect everything.
    if (w < MARQUEE_MIN_SIZE && h < MARQUEE_MIN_SIZE) {
      setSelectedIds([]);
      return;
    }

    const selection = aabbFromPoints(
      { x: state.startX, y: state.startY },
      { x: state.curX, y: state.curY },
    );

    const ids: string[] = [];
    for (const el of elementsRef.current) {
      const aabb = getElementAABB(el);
      if (aabb && aabbIntersects(selection, aabb)) ids.push(el.id);
    }
    setSelectedIds(ids);
  }, [elementsRef, setSelectedIds]);

  return { startMarquee, updateMarquee, endMarquee };
}
