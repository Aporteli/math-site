import type { CanvasElement } from '../types';
import { simplifyPoints } from '../simplifyPoints';

export interface BuildElementFromShapeParams {
  activeTool: string;
  activeShapeId: string;
  shape: any;
  strokeColor: string;
  strokeWidth: number;
  scale: number; // ← add
}

export function buildElementFromShape({
  activeTool,
  activeShapeId,
  shape,
  strokeColor,
  strokeWidth,
  scale, // ← add
}: BuildElementFromShapeParams): CanvasElement | null {
  if (
    activeTool === 'pen' ||
    activeTool === 'line' ||
    activeTool === 'arrow' ||
    activeTool === 'triangle' ||
    activeTool === 'diamond'
  ) {
    const rawPoints: number[] = shape.points();
    // const points = activeTool === 'pen' ? simplifyPoints(rawPoints, 1.5 / (scale || 1)) : rawPoints;

    const points = rawPoints;

    return {
      id: activeShapeId,
      type: activeTool === 'pen' ? 'freedraw' : activeTool,
      points,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    };
  }

  if (activeTool === 'rect') {
    return {
      id: activeShapeId,
      type: 'rect',
      x: shape.x(),
      y: shape.y(),
      width: shape.width(),
      height: shape.height(),
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    };
  }

  if (activeTool === 'circle') {
    return {
      id: activeShapeId,
      type: 'circle',
      x: shape.x(),
      y: shape.y(),
      radius: shape.radius(),
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    };
  }

  if (activeTool === 'star') {
    return {
      id: activeShapeId,
      type: 'star',
      x: shape.x(),
      y: shape.y(),
      radius: shape.outerRadius(),
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    };
  }

  return null;
}
