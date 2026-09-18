// KonvaCanvas/utils/recognize/recognizeCircle.ts
import { kasaFit, polygonArea, polygonPerimeter, Pt } from './geometry';

export interface RecognizedCircle {
  cx: number;
  cy: number;
  r: number;
}

const MIN_POINTS = 8;
const MIN_RADIUS = 10;
const MAX_RMS_DEV = 0.14;
const MAX_SINGLE_DEV = 0.35;
const MIN_ROUNDNESS = 0.83;
const MAX_ANGULAR_GAP = Math.PI * 0.55;
const MIN_ANGULAR_COVERAGE = Math.PI * 1.45;

export function recognizeCircle(flat: number[]): RecognizedCircle | null {
  const count = flat.length / 2;
  if (count < MIN_POINTS) return null;

  const fit = kasaFit(flat);
  if (!fit) return null;
  const { cx, cy, r } = fit;
  if (!isFinite(r) || r < MIN_RADIUS) return null;

  let sumSq = 0,
    maxDev = 0;
  for (let i = 0; i < flat.length; i += 2) {
    const d = Math.abs(Math.hypot(flat[i] - cx, flat[i + 1] - cy) - r);
    sumSq += d * d;
    if (d > maxDev) maxDev = d;
  }
  const rms = Math.sqrt(sumSq / count);
  if (rms > r * MAX_RMS_DEV) return null;
  if (maxDev > r * MAX_SINGLE_DEV) return null;

  const pts: Pt[] = [];
  for (let i = 0; i < flat.length; i += 2) pts.push({ x: flat[i], y: flat[i + 1] });
  const area = polygonArea(pts);
  const perim = polygonPerimeter(pts);
  if (perim <= 0) return null;
  const roundness = (4 * Math.PI * area) / (perim * perim);
  if (roundness < MIN_ROUNDNESS) return null;

  const angles = new Array<number>(count);
  for (let i = 0, j = 0; i < flat.length; i += 2, j++) {
    angles[j] = Math.atan2(flat[i + 1] - cy, flat[i] - cx);
  }
  angles.sort((a, b) => a - b);

  let maxGap = angles[0] + 2 * Math.PI - angles[count - 1];
  for (let i = 1; i < count; i++) {
    const gap = angles[i] - angles[i - 1];
    if (gap > maxGap) maxGap = gap;
  }
  if (maxGap > MAX_ANGULAR_GAP) return null;
  if (2 * Math.PI - maxGap < MIN_ANGULAR_COVERAGE) return null;

  return { cx, cy, r };
}
