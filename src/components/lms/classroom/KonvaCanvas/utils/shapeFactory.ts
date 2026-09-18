import Konva from 'konva';

/**
 * Pure factory that creates the in-flight Konva node for the given drawing tool.
 * Returns null for tools that don't create a shape (select / text / hand / etc.).
 */
export function createShapeNode(
  activeTool: string,
  startX: number,
  startY: number,
  strokeColor: string,
  strokeWidth: number,
): Konva.Shape | null {
  if (activeTool === 'pen') {
    return new Konva.Line({
      points: [startX, startY, startX + 0.1, startY + 0.1],
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      lineCap: 'round',
      lineJoin: 'round',
      // tension: 0.4,
    });
  }
  if (activeTool === 'line') {
    return new Konva.Line({
      points: [startX, startY, startX, startY],
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      lineCap: 'round',
      perfectDrawEnabled: false,
      strokeScaleEnabled: false,
    });
  }
  if (activeTool === 'arrow') {
    return new Konva.Arrow({
      points: [startX, startY, startX, startY],
      stroke: strokeColor,
      fill: strokeColor,
      strokeWidth: strokeWidth,
      pointerLength: Math.max(8, strokeWidth * 3),
      pointerWidth: Math.max(8, strokeWidth * 3),
      perfectDrawEnabled: false,
      strokeScaleEnabled: false,
    });
  }
  if (activeTool === 'rect') {
    return new Konva.Rect({
      x: startX,
      y: startY,
      width: 1,
      height: 1,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      perfectDrawEnabled: false,
      strokeScaleEnabled: false,
    });
  }
  if (activeTool === 'circle') {
    return new Konva.Circle({
      x: startX,
      y: startY,
      radius: 1,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      perfectDrawEnabled: false,
      strokeScaleEnabled: false,
    });
  }
  if (activeTool === 'triangle') {
    return new Konva.Line({
      points: [startX, startY, startX, startY, startX, startY],
      closed: true,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      lineJoin: 'round',
      perfectDrawEnabled: false,
      strokeScaleEnabled: false,
    });
  }
  if (activeTool === 'diamond') {
    return new Konva.Line({
      points: [startX, startY, startX, startY, startX, startY, startX, startY],
      closed: true,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      lineJoin: 'round',
      perfectDrawEnabled: false,
      strokeScaleEnabled: false,
    });
  }
  if (activeTool === 'star') {
    return new Konva.Star({
      x: startX,
      y: startY,
      numPoints: 5,
      innerRadius: 1,
      outerRadius: 2,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      perfectDrawEnabled: false,
      strokeScaleEnabled: false,
    });
  }
  return null;
}