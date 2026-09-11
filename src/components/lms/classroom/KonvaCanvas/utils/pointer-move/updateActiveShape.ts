import type { MutableRefObject, RefObject } from 'react';
import Konva from 'konva';
import type { CanvasElement } from '../types';
import { findSnapPoint } from '../snapping';

export interface UpdateActiveShapeContext {
  activeTool: string;
  elementsRef: MutableRefObject<CanvasElement[]>;
  activeShapeRef: MutableRefObject<any>;
  drawLayerRef: RefObject<Konva.Layer>;
}

/**
 * Grows/snaps the in-flight shape that was created on pointer-down. One branch
 * per tool. Always ends by calling `batchDraw` on the draw layer.
 */
export function updateActiveShape(
  ctx: UpdateActiveShapeContext,
  pos: { x: number; y: number },
): void {
  const shape = ctx.activeShapeRef.current;
  if (!shape) return;

  const snap = findSnapPoint(pos, ctx.elementsRef.current, ctx.activeTool);
  const snapX = snap.x;
  const snapY = snap.y;

  if (ctx.activeTool === 'pen') {
    const currentPts = shape.points();
    const len = currentPts.length;
    const lastX = currentPts[len - 2];
    const lastY = currentPts[len - 1];
    if (Math.hypot(pos.x - lastX, pos.y - lastY) >= 1.5) {
      shape.points(currentPts.concat([pos.x, pos.y]));
    }
  } else if (ctx.activeTool === 'line' || ctx.activeTool === 'arrow') {
    const points = shape.points();
    shape.points([points[0], points[1], snapX, snapY]);
  } else if (ctx.activeTool === 'rect') {
    shape.width(snapX - shape.x());
    shape.height(snapY - shape.y());
  } else if (ctx.activeTool === 'circle') {
    const dx = snapX - shape.x();
    const dy = snapY - shape.y();
    shape.radius(Math.sqrt(dx * dx + dy * dy));
  } else if (ctx.activeTool === 'triangle') {
    const startX = shape.attrs._startX ?? shape.points()[0];
    const startY = shape.attrs._startY ?? shape.points()[1];
    if (shape.attrs._startX === undefined) {
      shape.setAttr('_startX', startX);
      shape.setAttr('_startY', startY);
    }
    shape.points([(startX + snapX) / 2, startY, startX, snapY, snapX, snapY]);
  } else if (ctx.activeTool === 'diamond') {
    const startX = shape.attrs._startX ?? shape.points()[0];
    const startY = shape.attrs._startY ?? shape.points()[1];
    if (shape.attrs._startX === undefined) {
      shape.setAttr('_startX', startX);
      shape.setAttr('_startY', startY);
    }
    const midX = (startX + snapX) / 2;
    const midY = (startY + snapY) / 2;
    shape.points([midX, startY, snapX, midY, midX, snapY, startX, midY]);
  } else if (ctx.activeTool === 'star') {
    const dx = snapX - shape.x();
    const dy = snapY - shape.y();
    const radius = Math.sqrt(dx * dx + dy * dy);
    shape.innerRadius(radius * 0.4);
    shape.outerRadius(radius);
  }

  ctx.drawLayerRef.current?.batchDraw();
}