import type { CanvasElement } from '../types';

export interface BuildElementFromShapeParams {
  activeTool: string;
  activeShapeId: string;
  shape: any;
  strokeColor: string;
  strokeWidth: number;
}

/**
 * Pure: reads the finished Konva shape and produces the persisted
 * `CanvasElement` payload. Returns `null` when the tool has no persisted form.
 */
export function buildElementFromShape({
  activeTool,
  activeShapeId,
  shape,
  strokeColor,
  strokeWidth,
}: BuildElementFromShapeParams): CanvasElement | null {
  if (
    activeTool === 'pen' ||
    activeTool === 'line' ||
    activeTool === 'arrow' ||
    activeTool === 'triangle' ||
    activeTool === 'diamond'
  ) {
    return {
      id: activeShapeId,
      type: activeTool === 'pen' ? 'freedraw' : activeTool,
      points: shape.points(),
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