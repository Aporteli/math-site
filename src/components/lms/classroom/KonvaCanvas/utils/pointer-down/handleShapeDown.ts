import type { MutableRefObject, RefObject } from 'react';
import Konva from 'konva';
import type { CanvasElement } from '../types';
import { findSnapPoint } from '../snapping';
import { findNearbyEndpoint } from '../snapping/endpoints';
import { createShapeNode } from '../shapeFactory';

export interface HandleShapeDownContext {
  activeTool: string;
  elementsRef: MutableRefObject<CanvasElement[]>;
  isDrawing: MutableRefObject<boolean>;
  activeShapeIdRef: MutableRefObject<string>;
  activeShapeRef: MutableRefObject<any>;
  drawLayerRef: RefObject<Konva.Layer>;
  strokeColor: string;
  strokeWidth: number;
  scale: number;
  shiftKey: boolean;
}

export function handleShapeDown(
  ctx: HandleShapeDownContext,
  pos: { x: number; y: number },
): boolean {
  const id = `el_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const snap = findSnapPoint(pos, ctx.elementsRef.current, ctx.activeTool);

  const isLineDrawMode =
    (ctx.activeTool === 'pen' && ctx.shiftKey) || ctx.activeTool === 'line';

  let sx = snap.x;
  let sy = snap.y;
  if (isLineDrawMode) {
    const hit = findNearbyEndpoint(
      { x: sx, y: sy },
      ctx.elementsRef.current,
      ctx.scale,
    );
    if (hit) {
      sx = hit.x;
      sy = hit.y;
    }
  }

  ctx.isDrawing.current = true;
  ctx.activeShapeIdRef.current = id;

  const shapeNode = createShapeNode(
    ctx.activeTool,
    sx,
    sy,
    ctx.strokeColor,
    ctx.strokeWidth,
  );
  ctx.activeShapeRef.current = shapeNode;

  if (shapeNode && ctx.drawLayerRef.current) {
    ctx.drawLayerRef.current.add(shapeNode);
    ctx.drawLayerRef.current.batchDraw();
  }
  return true;
}