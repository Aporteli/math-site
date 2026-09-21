import type { CanvasElement } from '../types';

export interface BuildElementFromShapeParams {
  activeTool: string;
  activeShapeId: string;
  shape: any;
  strokeColor: string;
  strokeWidth: number;
  scale: number;
  penSmoothIntensity?: number;
}

export function buildElementFromShape({
  activeTool,
  activeShapeId,
  shape,
  strokeColor,
  strokeWidth,
  scale,
  penSmoothIntensity = 0,
}: BuildElementFromShapeParams): CanvasElement | null {
  if (
    activeTool === 'pen' ||
    activeTool === 'line' ||
    activeTool === 'arrow' ||
    activeTool === 'triangle' ||
    activeTool === 'diamond'
  ) {
    const rawPoints: number[] = shape.points();
    const points =
      activeTool === 'pen' && penSmoothIntensity > 0
        ? smoothPenPoints(rawPoints, penSmoothIntensity)
        : rawPoints;

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

function smoothPenPoints(flat: number[], intensity: number): number[] {
  if (intensity <= 0 || flat.length < 6) return flat;
  const n = flat.length / 2;
  const radius = Math.max(1, Math.round(1 + intensity * 8));
  const passes = 1 + Math.round(intensity * 3);
  let src = flat;
  for (let p = 0; p < passes; p++) {
    const out = new Array<number>(src.length);
    const count = src.length / 2;
    for (let i = 0; i < count; i++) {
      const a = Math.max(0, i - radius);
      const b = Math.min(count - 1, i + radius);
      let sx = 0;
      let sy = 0;
      let w = 0;
      for (let j = a; j <= b; j++) {
        sx += src[j * 2];
        sy += src[j * 2 + 1];
        w += 1;
      }
      out[i * 2] = sx / w;
      out[i * 2 + 1] = sy / w;
    }
    out[0] = src[0];
    out[1] = src[1];
    out[out.length - 2] = src[src.length - 2];
    out[out.length - 1] = src[src.length - 1];
    src = out;
  }
  return src;
}
