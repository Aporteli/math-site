import {
  compileDerivative,
  compileEvaluator,
  compileSecondDerivative,
  type CompiledFn,
  type GraphFunction,
} from "@/lib/math/graphing";

export type MarkerKind =
  | "root"
  | "yIntercept"
  | "intersection"
  | "max"
  | "min";

export interface GraphMarker {
  id: string;
  kind: MarkerKind;
  x: number;
  y: number;
  color: string;
  fnIndex?: number;
}

const SAMPLE_COUNT = 420;
const ROOT_EPS = 1e-8;
const DEDUPE_EPS = 1e-3;
const MAX_MARKERS_PER_KIND = 36;
const ZERO_Y = 1e-7;

export function visibleFunctions(rows: GraphFunction[]) {
  return rows.filter((row) => row.visible && !row.error && row.expr.trim());
}

export function evaluatorFor(row: GraphFunction): CompiledFn {
  return compileEvaluator(row.expr, row.params);
}

export function findZeros(
  fn: CompiledFn,
  xmin: number,
  xmax: number,
): number[] {
  if (!(xmax > xmin)) return [];
  const roots: number[] = [];
  const step = (xmax - xmin) / SAMPLE_COUNT;
  let prevX = xmin;
  let prevY = fn(xmin);

  for (let i = 1; i <= SAMPLE_COUNT; i += 1) {
    const x = i === SAMPLE_COUNT ? xmax : xmin + i * step;
    const y = fn(x);
    if (y !== null && Math.abs(y) < ZERO_Y) {
      roots.push(x);
    } else if (
      prevY !== null &&
      y !== null &&
      Math.sign(prevY) !== Math.sign(y) &&
      prevY !== 0
    ) {
      const root = bisect(fn, prevX, x, prevY, y);
      if (root !== null) roots.push(root);
    }
    prevX = x;
    prevY = y;
  }

  return dedupe(roots).slice(0, MAX_MARKERS_PER_KIND);
}

function bisect(
  fn: CompiledFn,
  left: number,
  right: number,
  leftY: number,
  rightY: number,
): number | null {
  let lo = left;
  let hi = right;
  let yLo = leftY;
  let yHi = rightY;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    const yMid = fn(mid);
    if (yMid === null) return null;
    if (Math.abs(yMid) < ROOT_EPS || hi - lo < ROOT_EPS) return mid;
    if (Math.sign(yLo) !== Math.sign(yMid) && yLo !== 0) {
      hi = mid;
      yHi = yMid;
    } else if (Math.sign(yHi) !== Math.sign(yMid) && yHi !== 0) {
      lo = mid;
      yLo = yMid;
    } else {
      return Math.abs(yMid) < Math.abs(yLo) ? mid : lo;
    }
  }
  return (lo + hi) / 2;
}

function dedupe(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const unique: number[] = [];
  for (const value of sorted) {
    const last = unique[unique.length - 1];
    if (last === undefined || Math.abs(last - value) > DEDUPE_EPS) {
      unique.push(value);
    }
  }
  return unique;
}

export function collectMarkers(
  rows: GraphFunction[],
  domain: [number, number],
): GraphMarker[] {
  const visible = visibleFunctions(rows);
  const markers: GraphMarker[] = [];
  const [xmin, xmax] = domain;

  visible.forEach((row, index) => {
    const fn = evaluatorFor(row);
    const y0 = fn(0);
    if (y0 !== null) {
      markers.push({
        id: `${row.id}-y0`,
        kind: "yIntercept",
        x: 0,
        y: y0,
        color: row.color,
        fnIndex: index,
      });
    }

    for (const x of findZeros(fn, xmin, xmax)) {
      const y = fn(x);
      if (y === null) continue;
      markers.push({
        id: `${row.id}-root-${x.toFixed(5)}`,
        kind: "root",
        x,
        y: Math.abs(y) < ZERO_Y ? 0 : y,
        color: row.color,
        fnIndex: index,
      });
    }

    const d1 = compileDerivative(row.expr, row.params);
    const d2 = compileSecondDerivative(row.expr, row.params);
    for (const x of findZeros(d1, xmin, xmax)) {
      const y = fn(x);
      const curve = d2(x);
      if (y === null || curve === null || Math.abs(curve) < 1e-6) continue;
      markers.push({
        id: `${row.id}-ext-${x.toFixed(5)}`,
        kind: curve < 0 ? "max" : "min",
        x,
        y,
        color: row.color,
        fnIndex: index,
      });
    }
  });

  for (let i = 0; i < visible.length; i += 1) {
    for (let j = i + 1; j < visible.length; j += 1) {
      const left = visible[i];
      const right = visible[j];
      if (!left || !right) continue;
      const f = evaluatorFor(left);
      const g = evaluatorFor(right);
      const diff: CompiledFn = (x) => {
        const a = f(x);
        const b = g(x);
        if (a === null || b === null) return null;
        return a - b;
      };
      for (const x of findZeros(diff, xmin, xmax)) {
        const y = f(x);
        if (y === null) continue;
        markers.push({
          id: `${left.id}-${right.id}-x-${x.toFixed(5)}`,
          kind: "intersection",
          x,
          y,
          color: "#9333ea",
          fnIndex: i,
        });
      }
    }
  }

  return markers;
}

export function nearestMarker(
  markers: GraphMarker[],
  x: number,
  y: number,
  xSpan: number,
  ySpan: number,
): GraphMarker | null {
  let best: GraphMarker | null = null;
  let bestDist = Infinity;
  const nx = Math.max(xSpan, 1e-6);
  const ny = Math.max(ySpan, 1e-6);
  for (const marker of markers) {
    const dx = (marker.x - x) / nx;
    const dy = (marker.y - y) / ny;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = marker;
    }
  }
  return bestDist < 0.0009 ? best : null;
}

export function definiteIntegral(
  fn: CompiledFn,
  a: number,
  b: number,
  n = 400,
): number | null {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) {
    return a === b ? 0 : null;
  }
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const count = Math.max(4, n - (n % 2));
  const h = (hi - lo) / count;
  let sum = 0;
  let missing = 0;
  for (let i = 0; i <= count; i += 1) {
    const y = fn(lo + i * h);
    if (y === null) {
      missing += 1;
      continue;
    }
    const weight = i === 0 || i === count ? 1 : i % 2 === 0 ? 2 : 4;
    sum += weight * y;
  }
  if (missing > count / 8) return null;
  const result = (h / 3) * sum;
  return b < a ? -result : result;
}

export function sampleFill(
  upper: CompiledFn,
  lower: CompiledFn | null,
  a: number,
  b: number,
  samples = 80,
): { upper: [number, number][]; lower: [number, number][] } | null {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const top: [number, number][] = [];
  const bottom: [number, number][] = [];
  const n = Math.max(8, samples);
  for (let i = 0; i <= n; i += 1) {
    const x = lo + ((hi - lo) * i) / n;
    const yTop = upper(x);
    const yBottom = lower ? lower(x) : 0;
    if (yTop === null || yBottom === null) continue;
    top.push([x, yTop]);
    bottom.push([x, yBottom]);
  }
  if (top.length < 4) return null;
  return { upper: top, lower: bottom };
}

export function valueTable(
  rows: GraphFunction[],
  start: number,
  end: number,
  step: number,
): { x: number; ys: (number | null)[] }[] {
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(step)) {
    return [];
  }
  if (step === 0 || (end - start) * step < 0) return [];
  const fns = visibleFunctions(rows).map(evaluatorFor);
  const out: { x: number; ys: (number | null)[] }[] = [];
  const maxRows = 201;
  const direction = step > 0 ? 1 : -1;
  for (let i = 0, x = start; i < maxRows; i += 1, x = start + i * step) {
    if (direction > 0 && x > end + Math.abs(step) / 2) break;
    if (direction < 0 && x < end - Math.abs(step) / 2) break;
    out.push({
      x,
      ys: fns.map((fn) => fn(x)),
    });
  }
  return out;
}

export function tangentAt(
  row: GraphFunction,
  x0: number,
): { y0: number; m: number } | null {
  const y0 = evaluatorFor(row)(x0);
  const m = compileDerivative(row.expr, row.params)(x0);
  if (y0 === null || m === null) return null;
  return { y0, m };
}
