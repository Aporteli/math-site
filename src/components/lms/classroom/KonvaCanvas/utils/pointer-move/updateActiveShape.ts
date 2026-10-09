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
  penPoints?: { x: number; y: number }[];
}

function appendPenPoints(shape: { attrs: { points?: number[] }; points: (pts: number[]) => void }, incoming: { x: number; y: number }[]) {
  const currentPts = shape.attrs.points;
  if (!currentPts) return;
  let grew = false;
  for (const p of incoming) {
    const n = currentPts.length;
    if (n >= 2 && Math.hypot(p.x - currentPts[n - 2], p.y - currentPts[n - 1]) < 1.5) continue;
    currentPts.push(p.x, p.y);
    grew = true;
  }
  if (grew) shape.points(currentPts);
}

export function updateActiveShape(ctx: UpdateActiveShapeContext, pos: { x: number; y: number }): void {
  const shape = ctx.activeShapeRef.current;
  if (!shape) return;

  if (ctx.activeTool === 'pen' && !ctx.shiftHeld) {
    const incoming = ctx.penPoints && ctx.penPoints.length > 0 ? ctx.penPoints : [pos];
    appendPenPoints(shape, incoming);
    ctx.drawLayerRef.current?.batchDraw();
    return;
  }

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
    const pts = shape.points();
    const startX = pts[0];
    const startY = pts[1];
    shape.points([startX, startY, snapX, snapY]);
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
