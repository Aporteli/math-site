import type Konva from 'konva';

/**
 * Temporary probe for synchronous Konva Layer.draw() time.
 * The wrapper is not installed until `__wbMainLayerDraw.start()` runs in this browser.
 * This measures the duration of the draw() call itself. It does not measure
 * browser paint, GPU work, or the time until a remote stroke becomes visible.
 *
 * Remove this file, useMainLayerDrawProbe.ts, and its call in KonvaCanvas.tsx
 * to restore the original behavior.
 */

const PROBE = Symbol.for('mathlab.wbMainLayerDrawProbe');
const MAX_RETAINED_CALLS = 4000;

/** New value on every evaluation, so a replaced module can recognize its own wrapper. */
export const probeGeneration = Symbol('wb-main-layer-draw-probe');

type LayerDraw = Konva.Layer['draw'];

interface ProbeState {
  original: LayerDraw;
  wrapped: LayerDraw;
  generation: symbol;
}

type ProbedLayer = Konva.Layer & { [PROBE]?: ProbeState };

export interface MainLayerDrawReport {
  label: 'synchronous Layer.draw() invocation duration; not browser paint, GPU work, or stroke visibility';
  active: boolean;
  /** Milliseconds since the last start() or reset(), using performance.now(). */
  intervalMs: number;
  count: number;
  totalMs: number;
  averageMs: number;
  maxMs: number;
  retainedCalls: number;
  droppedCalls: number;
}

interface DrawApi {
  start: () => MainLayerDrawReport;
  reset: () => MainLayerDrawReport;
  report: () => MainLayerDrawReport;
  calls: () => number[];
  stop: () => MainLayerDrawReport;
}

const layers = new Set<Konva.Layer>();
const durations: number[] = [];

let active = false;
let count = 0;
let totalMs = 0;
let maxMs = 0;
let droppedCalls = 0;
let intervalStartedAt = 0;
let apiPublished = false;

function round(ms: number): number {
  return Math.round(ms * 1000) / 1000;
}

function record(durationMs: number): void {
  count += 1;
  totalMs += durationMs;
  if (durationMs > maxMs) maxMs = durationMs;
  if (durations.length < MAX_RETAINED_CALLS) durations.push(durationMs);
  else droppedCalls += 1;
}

function clearSamples(): void {
  count = 0;
  totalMs = 0;
  maxMs = 0;
  droppedCalls = 0;
  durations.length = 0;
  intervalStartedAt = performance.now();
}

export function mainLayerDrawReport(): MainLayerDrawReport {
  return {
    label: 'synchronous Layer.draw() invocation duration; not browser paint, GPU work, or stroke visibility',
    active,
    intervalMs: intervalStartedAt === 0 ? 0 : round(performance.now() - intervalStartedAt),
    count,
    totalMs: round(totalMs),
    averageMs: count === 0 ? 0 : round(totalMs / count),
    maxMs: round(maxMs),
    retainedCalls: durations.length,
    droppedCalls,
  };
}

/** Drop a wrapper left by a previous module. Never overwrite a draw method this module did not install. */
function unwrapStale(layer: Konva.Layer): void {
  const target = layer as ProbedLayer;
  const state = target[PROBE];
  if (!state || state.generation === probeGeneration) return;
  if (layer.draw === state.wrapped) layer.draw = state.original;
  delete target[PROBE];
}

function attach(layer: Konva.Layer): void {
  unwrapStale(layer);
  const target = layer as ProbedLayer;
  const existing = target[PROBE];
  if (existing?.generation === probeGeneration) {
    if (layer.draw === existing.wrapped) return;
    delete target[PROBE];
    if (layer.draw !== existing.original) return;
  }

  const original = layer.draw;
  const wrapped = function (this: Konva.Layer, ...args: Parameters<LayerDraw>): ReturnType<LayerDraw> {
    const started = performance.now();
    try {
      return original.apply(this, args);
    } finally {
      record(performance.now() - started);
    }
  } as LayerDraw;

  layer.draw = wrapped;
  target[PROBE] = { original, wrapped, generation: probeGeneration };
}

function detach(layer: Konva.Layer): void {
  const target = layer as ProbedLayer;
  const state = target[PROBE];
  if (!state || state.generation !== probeGeneration) return;
  if (layer.draw === state.wrapped) layer.draw = state.original;
  delete target[PROBE];
}

function start(): MainLayerDrawReport {
  if (!active) {
    active = true;
    for (const layer of layers) attach(layer);
  }
  clearSamples();
  return mainLayerDrawReport();
}

function reset(): MainLayerDrawReport {
  clearSamples();
  return mainLayerDrawReport();
}

function stop(): MainLayerDrawReport {
  active = false;
  for (const layer of layers) detach(layer);
  return mainLayerDrawReport();
}

export function registerMainLayerDrawProbe(layer: Konva.Layer): () => void {
  unwrapStale(layer);
  layers.add(layer);
  if (active) attach(layer);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    detach(layer);
    layers.delete(layer);
  };
}

function disposeProbeModule(): void {
  for (const layer of layers) detach(layer);
  layers.clear();
  active = false;
  apiPublished = false;
  if (typeof window !== 'undefined') {
    delete (window as Window & { __wbMainLayerDraw?: DrawApi }).__wbMainLayerDraw;
  }
}

type HotDispose = { dispose: (callback: () => void) => void };

const hot = (import.meta as ImportMeta & { webpackHot?: HotDispose; hot?: HotDispose }).webpackHot
  ?? (import.meta as ImportMeta & { hot?: HotDispose }).hot;
hot?.dispose(disposeProbeModule);

export function publishMainLayerDrawProbe(): void {
  if (typeof window === 'undefined' || apiPublished) return;
  apiPublished = true;
  const api: DrawApi = {
    start,
    reset,
    report: mainLayerDrawReport,
    calls: () => durations.slice(),
    stop,
  };
  (window as Window & { __wbMainLayerDraw?: DrawApi }).__wbMainLayerDraw = api;
}
