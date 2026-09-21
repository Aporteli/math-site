import type { MutableRefObject, RefObject } from 'react';
import Konva from 'konva';
import type { CanvasElement } from '../types';
import { findSnapPoint } from '../snapping';
import { findNearbyEndpoint } from '../snapping/endpoints';

export interface UpdateActiveShapeContext {
  activeTool: string;
  elementsRef: MutableRefObject<CanvasElement[]>;
  activeShapeRef: MutableRefObject<any>;
  drawLayerRef: RefObject<Konva.Layer>;
  scale: number;
  shiftHeld?: boolean;
}

export function updateActiveShape(ctx: UpdateActiveShapeContext, pos: { x: number; y: number }): void {
  const shape = ctx.activeShapeRef.current;
  if (!shape) return;

  const snap = findSnapPoint(pos, ctx.elementsRef.current, ctx.activeTool);
  let snapX = snap.x;
  let snapY = snap.y;

  // Snap the cursor to any nearby vertex (endpoint OR interior junction)
  // for the tools where the endpoint is meaningful.
  const isEndpointTool = ctx.activeTool === 'line' || ctx.activeTool === 'arrow' || ctx.activeTool === 'pen';

  if (isEndpointTool) {
    const hit = findNearbyEndpoint({ x: snapX, y: snapY }, ctx.elementsRef.current, ctx.scale);
    if (hit) {
      snapX = hit.x;
      snapY = hit.y;
    }
  }

  if (ctx.activeTool === 'pen') {
    if (ctx.shiftHeld) {
      const pts = shape.points();
      const startX = pts[0];
      const startY = pts[1];
      shape.points([startX, startY, snapX, snapY]);
    } else {
      const currentPts = shape.points();
      const lastX = currentPts[currentPts.length - 2];
      const lastY = currentPts[currentPts.length - 1];
      if (Math.hypot(pos.x - lastX, pos.y - lastY) >= 1.5) {
        shape.points(currentPts.concat([pos.x, pos.y]));
      }
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
