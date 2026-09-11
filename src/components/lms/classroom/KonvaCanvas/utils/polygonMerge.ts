import type { CanvasElement } from '../utils/types';

export function tryMergeClosedPolygon(
  allElements: CanvasElement[],
  newLine: CanvasElement,
): CanvasElement[] | null {
  if (newLine.type !== 'line' || !newLine.points || newLine.points.length !== 4) return null;

  interface Segment {
    el: CanvasElement;
    p1: { x: number; y: number };
    p2: { x: number; y: number };
  }

  const getAbsEnds = (el: CanvasElement): { p1: { x: number; y: number }; p2: { x: number; y: number } } => {
    const pts = el.points || [0, 0, 0, 0];
    const cos = Math.cos(((el.rotation || 0) * Math.PI) / 180);
    const sin = Math.sin(((el.rotation || 0) * Math.PI) / 180);
    const ex = el.x || 0;
    const ey = el.y || 0;
    const sx = el.scaleX || 1;
    const sy = el.scaleY || 1;

    const x1 = pts[0] * sx;
    const y1 = pts[1] * sy;
    const x2 = pts[2] * sx;
    const y2 = pts[3] * sy;

    return {
      p1: { x: ex + x1 * cos - y1 * sin, y: ey + x1 * sin + y1 * cos },
      p2: { x: ex + x2 * cos - y2 * sin, y: ey + x2 * sin + y2 * cos },
    };
  };

  const lineElements = allElements.filter((el) => el.type === 'line' && el.points && el.points.length === 4);
  const segments: Segment[] = [...lineElements, newLine].map((el) => ({
    el,
    ...getAbsEnds(el),
  }));

  const EPSILON = 18;
  const isClose = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y) <= EPSILON;

  const used = new Set<string>();
  const currentPath: { pt: { x: number; y: number }; seg: Segment }[] = [];

  const lastSeg = segments[segments.length - 1];

  function findCycle(
    currentPoint: { x: number; y: number },
    startPoint: { x: number; y: number },
    depth: number,
  ): boolean {
    if (depth >= 3 && isClose(currentPoint, startPoint)) {
      return true;
    }
    if (depth > 8) return false;

    for (const seg of segments) {
      if (used.has(seg.el.id)) continue;

      if (isClose(currentPoint, seg.p1)) {
        used.add(seg.el.id);
        currentPath.push({ pt: seg.p2, seg });
        if (findCycle(seg.p2, startPoint, depth + 1)) return true;
        currentPath.pop();
        used.delete(seg.el.id);
      } else if (isClose(currentPoint, seg.p2)) {
        used.add(seg.el.id);
        currentPath.push({ pt: seg.p1, seg });
        if (findCycle(seg.p1, startPoint, depth + 1)) return true;
        currentPath.pop();
        used.delete(seg.el.id);
      }
    }
    return false;
  }

  used.add(lastSeg.el.id);
  currentPath.push({ pt: lastSeg.p2, seg: lastSeg });

  let found = findCycle(lastSeg.p2, lastSeg.p1, 1);

  if (!found) {
    used.clear();
    currentPath.length = 0;
    used.add(lastSeg.el.id);
    currentPath.push({ pt: lastSeg.p1, seg: lastSeg });
    found = findCycle(lastSeg.p1, lastSeg.p2, 1);
  }

  if (found && currentPath.length >= 3) {
    const polygonPoints: number[] = [];
    currentPath.forEach((step) => {
      polygonPoints.push(Math.round(step.pt.x), Math.round(step.pt.y));
    });

    const usedIds = new Set(currentPath.map((p) => p.seg.el.id));
    const remaining = allElements.filter((el) => !usedIds.has(el.id));

    const mergedPolygon: CanvasElement = {
      id: `poly_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'triangle',
      points: polygonPoints,
      x: 0,
      y: 0,
      stroke: newLine.stroke,
      strokeWidth: newLine.strokeWidth,
    };

    return [...remaining, mergedPolygon];
  }

  return null;
}