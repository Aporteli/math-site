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
  mode: 'rect' | 'freeform' | 'draw';
}

const DRAW_JOIN = 36;

function pointInPolygon(x: number, y: number, poly: number[]) {
  let inside = false;
  const n = poly.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i * 2];
    const yi = poly[i * 2 + 1];
    const xj = poly[j * 2];
    const yj = poly[j * 2 + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi) inside = !inside;
  }
  return inside;
}

function worldPoint(el: CanvasElement, lx: number, ly: number) {
  const sx = el.scaleX || 1;
  const sy = el.scaleY || 1;
  let x = lx * sx;
  let y = ly * sy;
  const rotation = el.rotation || 0;
  if (rotation !== 0) {
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    x = rx;
    y = ry;
  }
  return { x: x + (el.x || 0), y: y + (el.y || 0) };
}

function elementInsideShape(el: CanvasElement, poly: number[]) {
  const inside = (x: number, y: number) => pointInPolygon(x, y, poly);
  if (
    el.points &&
    el.points.length >= 2 &&
    (el.type === 'freedraw' ||
      el.type === 'line' ||
      el.type === 'arrow' ||
      el.type === 'triangle' ||
      el.type === 'diamond' ||
      el.type === 'parallelogram')
  ) {
    for (let i = 0; i < el.points.length; i += 2) {
      const p = worldPoint(el, el.points[i], el.points[i + 1]);
      if (!inside(p.x, p.y)) return false;
    }
    return true;
  }
  const box = getElementAABB(el);
  if (!box) return false;
  return (
    inside(box.minX, box.minY) &&
    inside(box.maxX, box.minY) &&
    inside(box.maxX, box.maxY) &&
    inside(box.minX, box.maxY)
  );
}

function elementHitsLasso(el: CanvasElement, poly: number[]) {
  const box = getElementAABB(el);
  if (!box) return false;
  const samples = [
    { x: box.minX, y: box.minY },
    { x: box.maxX, y: box.minY },
    { x: box.maxX, y: box.maxY },
    { x: box.minX, y: box.maxY },
    { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 },
  ];
  if (samples.some((p) => pointInPolygon(p.x, p.y, poly))) return true;
  for (let i = 0; i < poly.length; i += 2) {
    const x = poly[i];
    const y = poly[i + 1];
    if (x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY) return true;
  }
  return false;
}

export function useMarqueeSelection({ elementsRef, marqueeLayerRef, setSelectedIds, mode }: Options) {
  const rectRef = useRef<Konva.Rect | null>(null);
  const lineRef = useRef<Konva.Line | null>(null);
  const pointsRef = useRef<number[]>([]);
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

  const ensureLine = useCallback(() => {
    if (lineRef.current) return lineRef.current;
    const layer = marqueeLayerRef.current;
    if (!layer) return null;
    const line = new Konva.Line({
      points: [],
      closed: true,
      fill: 'rgba(99, 102, 241, 0.15)',
      stroke: 'rgba(99, 102, 241, 0.9)',
      strokeWidth: 1.5,
      dash: [4, 4],
      lineCap: 'round',
      lineJoin: 'round',
      listening: false,
      visible: false,
    });
    lineRef.current = line;
    layer.add(line);
    return line;
  }, [marqueeLayerRef]);

  const startMarquee = useCallback(
    (pos: { x: number; y: number }) => {
      stateRef.current = { active: true, startX: pos.x, startY: pos.y, curX: pos.x, curY: pos.y };
      if (mode === 'freeform' || mode === 'draw') {
        pointsRef.current = [pos.x, pos.y];
        rectRef.current?.visible(false);
        const line = ensureLine();
        if (line) {
          const draw = mode === 'draw';
          line.closed(!draw);
          line.dash(draw ? [] : [4, 4]);
          line.fill(draw ? 'transparent' : 'rgba(99, 102, 241, 0.15)');
          line.strokeWidth(draw ? 2.5 : 1.5);
          line.points(pointsRef.current.slice());
          line.visible(true);
          line.getLayer()?.batchDraw();
        }
        return;
      }
      lineRef.current?.visible(false);
      const rect = ensureRect();
      if (rect) {
        rect.visible(true);
        rect.position({ x: pos.x, y: pos.y });
        rect.size({ width: 0, height: 0 });
        rect.getLayer()?.batchDraw();
      }
    },
    [ensureRect, ensureLine, mode],
  );

  const updateMarquee = useCallback(
    (pos: { x: number; y: number }) => {
      const state = stateRef.current;
      if (!state.active) return;
      state.curX = pos.x;
      state.curY = pos.y;

      if (mode === 'freeform' || mode === 'draw') {
        const pts = pointsRef.current;
        const lastX = pts[pts.length - 2];
        const lastY = pts[pts.length - 1];
        if (Math.hypot(pos.x - lastX, pos.y - lastY) < 2) return;
        pts.push(pos.x, pos.y);
        const line = lineRef.current;
        if (!line) return;
        if (mode === 'draw') {
          const joined = pts.length >= 8 && Math.hypot(pos.x - pts[0], pos.y - pts[1]) <= DRAW_JOIN;
          line.closed(joined);
          line.fill(joined ? 'rgba(99, 102, 241, 0.12)' : 'transparent');
        }
        line.points(pts.slice());
        line.getLayer()?.batchDraw();
        return;
      }

      const rect = rectRef.current;
      if (!rect) return;

      const x = Math.min(state.startX, pos.x);
      const y = Math.min(state.startY, pos.y);
      rect.position({ x, y });
      rect.size({ width: Math.abs(pos.x - state.startX), height: Math.abs(pos.y - state.startY) });
      rect.getLayer()?.batchDraw();
    },
    [mode],
  );

  const endMarquee = useCallback(() => {
    const state = stateRef.current;
    if (!state.active) return;
    state.active = false;

    if (mode === 'freeform' || mode === 'draw') {
      const line = lineRef.current;
      if (line) {
        line.visible(false);
        line.getLayer()?.batchDraw();
      }
      const pts = pointsRef.current;
      const startX = pts[0] ?? 0;
      const startY = pts[1] ?? 0;
      const endX = pts[pts.length - 2] ?? startX;
      const endY = pts[pts.length - 1] ?? startY;
      const moved = Math.hypot(endX - startX, endY - startY);
      if (mode === 'draw') {
        if (pts.length < 6) {
          setSelectedIds([]);
          return;
        }
        if (pts.length < 8 || moved > DRAW_JOIN) return;
        const ids: string[] = [];
        for (const el of elementsRef.current) {
          if (elementInsideShape(el, pts)) ids.push(el.id);
        }
        setSelectedIds(ids);
        return;
      }
      if (pts.length < 6 || (moved < MARQUEE_MIN_SIZE && pts.length < 8)) {
        setSelectedIds([]);
        return;
      }
      const ids: string[] = [];
      for (const el of elementsRef.current) {
        if (elementHitsLasso(el, pts)) ids.push(el.id);
      }
      setSelectedIds(ids);
      return;
    }

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
  }, [elementsRef, mode, setSelectedIds]);

  return { startMarquee, updateMarquee, endMarquee };
}
