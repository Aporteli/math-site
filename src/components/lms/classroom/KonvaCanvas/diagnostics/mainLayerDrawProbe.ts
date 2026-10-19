import type Konva from 'konva';

/**
 * Temporary probe for synchronous Konva Layer.draw() time.
 * The wrapper is not installed until `__wbMainLayerDraw.start()` runs in this browser.
 * This measures the duration of the draw() call itself. It does not measure
 * browser paint, GPU work, or the time until a remote stroke becomes visible.
 *
 * Remove this file, useMainLayerDrawProbe.ts, its call in KonvaCanvas.tsx,
 * and the noteSender/noteReceiver calls in useWhiteboardState.ts,
 * usePublishDataSafe.ts, and useWhiteboardDataChannel.ts.
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

export interface SenderStrokeReport {
  messageId: string;
  /**
   * performance.now() at WHITEBOARD_DELTA sendNow entry minus performance.now() at scheduleFlush.
   * Same browser only. Includes whenContentIdle and any full sync that flush runs before this delta.
   * Null when this browser did not observe scheduleFlush before sendNow.
   */
  queueMs: number | null;
  skippedLaterDeltas: number;
  measures: 'Sender-local wait before publishData. Do not subtract this from receiver performance.now() values.';
  missing: string[];
}

export interface ReceiverStrokeReport {
  messageId: string;
  elementCountAtSetPages: number;
  elementCountAtStageFlush: number | null;
  elementCountMismatch: boolean;
  setPagesReturnedAt: number;
  afterStageFlushAt: number | null;
  drawStartedAt: number | null;
  drawEndedAt: number | null;
  frameAfterDrawAt: number | null;
  intervals: {
    setPagesToStageFlushMs: number | null;
    stageFlushToDrawStartMs: number | null;
    drawMs: number | null;
    drawEndToNextFrameMs: number | null;
  };
  skippedLaterDeltas: number;
  missing: string[];
  measures: {
    setPagesReturnedAt: 'performance.now() immediately after setPages for this WHITEBOARD_DELTA. React has not committed the elements yet.';
    afterStageFlushAt: 'performance.now() in KonvaCanvas useLayoutEffect when its elements prop is the same array passed to setPages and the main layer ref is set. React runs descendant layout effects first. react-konva StageWrap flushes the Konva tree and Layer.batchDraw schedules its animation frame inside that child effect, before this timestamp. useElementTransform layout effect on KonvaCanvas runs before this one and returns immediately when no group drag is active. This is not setPages, not the start of rendering, and not Layer.draw.';
    drawStartedAt: 'performance.now() at the start of the first main-layer Layer.draw whose start is at or after afterStageFlushAt.';
    drawEndedAt: 'performance.now() when that Layer.draw call returns. The duration is drawScene plus drawHit for that invocation only.';
    frameAfterDrawAt: 'performance.now() inside the single requestAnimationFrame callback scheduled when that draw returns. This does not measure physical screen presentation.';
  };
}

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
  /** Main-layer draws since the last start() or reset(), with performance.now() at each call's start. */
  draws: Array<{ startedAt: number; durationMs: number }>;
  sender: SenderStrokeReport | null;
  receiver: ReceiverStrokeReport | null;
}

interface DrawSample {
  startedAt: number;
  durationMs: number;
}

interface SenderStroke {
  messageId: string;
  /** Null when scheduleFlush was not observed in this browser before sendNow. */
  queueMs: number | null;
}

interface ReceiverStroke {
  messageId: string;
  /** Page array passed to setPages. The layout effect must see this same reference. */
  elements: readonly unknown[];
  elementCountAtSetPages: number;
  /** performance.now() immediately after setPages. React has not committed yet. */
  setPagesReturnedAt: number;
  /** Null until the probe layout effect sees a new elements array while the layer exists. */
  afterStageFlushAt: number | null;
  elementCountAtStageFlush: number | null;
  drawStartedAt: number | null;
  drawEndedAt: number | null;
  frameAfterDrawAt: number | null;
}

interface DrawApi {
  start: () => MainLayerDrawReport;
  reset: () => MainLayerDrawReport;
  report: () => MainLayerDrawReport;
  calls: () => number[];
  stop: () => MainLayerDrawReport;
}

const layers = new Set<Konva.Layer>();
const draws: DrawSample[] = [];

let active = false;
let count = 0;
let totalMs = 0;
let maxMs = 0;
let droppedCalls = 0;
let intervalStartedAt = 0;
let apiPublished = false;
let frameToken = 0;
let senderQueueStart = 0;
let skippedSenderDeltas = 0;
let skippedReceiverDeltas = 0;
let sender: SenderStroke | null = null;
let receiver: ReceiverStroke | null = null;

function round(ms: number): number {
  return Math.round(ms * 1000) / 1000;
}

function record(startedAt: number, durationMs: number): void {
  count += 1;
  totalMs += durationMs;
  if (durationMs > maxMs) maxMs = durationMs;
  if (draws.length < MAX_RETAINED_CALLS) draws.push({ startedAt, durationMs });
  else droppedCalls += 1;
}

function clearTrial(): void {
  frameToken += 1;
  senderQueueStart = 0;
  skippedSenderDeltas = 0;
  skippedReceiverDeltas = 0;
  sender = null;
  receiver = null;
}

function clearSamples(): void {
  count = 0;
  totalMs = 0;
  maxMs = 0;
  droppedCalls = 0;
  draws.length = 0;
  clearTrial();
  intervalStartedAt = performance.now();
}

function gap(later: number | null, earlier: number | null): number | null {
  if (later === null || earlier === null) return null;
  return round(later - earlier);
}

function senderReport(): SenderStrokeReport | null {
  if (!sender) return null;
  return {
    messageId: sender.messageId,
    queueMs: sender.queueMs === null ? null : round(sender.queueMs),
    skippedLaterDeltas: skippedSenderDeltas,
    measures: 'Sender-local wait before publishData. Do not subtract this from receiver performance.now() values.',
    missing: sender.queueMs === null ? ['senderQueueStart'] : [],
  };
}

function receiverReport(): ReceiverStrokeReport | null {
  if (!receiver) return null;
  const missing: string[] = [];
  if (receiver.afterStageFlushAt === null) missing.push('afterStageFlushAt');
  if (receiver.drawStartedAt === null) missing.push('drawStartedAt');
  if (receiver.drawEndedAt === null) missing.push('drawEndedAt');
  if (receiver.frameAfterDrawAt === null) missing.push('frameAfterDrawAt');
  const elementCountMismatch =
    receiver.elementCountAtStageFlush !== null && receiver.elementCountAtStageFlush !== receiver.elementCountAtSetPages;
  return {
    messageId: receiver.messageId,
    elementCountAtSetPages: receiver.elementCountAtSetPages,
    elementCountAtStageFlush: receiver.elementCountAtStageFlush,
    elementCountMismatch,
    setPagesReturnedAt: round(receiver.setPagesReturnedAt),
    afterStageFlushAt: receiver.afterStageFlushAt === null ? null : round(receiver.afterStageFlushAt),
    drawStartedAt: receiver.drawStartedAt === null ? null : round(receiver.drawStartedAt),
    drawEndedAt: receiver.drawEndedAt === null ? null : round(receiver.drawEndedAt),
    frameAfterDrawAt: receiver.frameAfterDrawAt === null ? null : round(receiver.frameAfterDrawAt),
    intervals: {
      setPagesToStageFlushMs: gap(receiver.afterStageFlushAt, receiver.setPagesReturnedAt),
      stageFlushToDrawStartMs: gap(receiver.drawStartedAt, receiver.afterStageFlushAt),
      drawMs: gap(receiver.drawEndedAt, receiver.drawStartedAt),
      drawEndToNextFrameMs: gap(receiver.frameAfterDrawAt, receiver.drawEndedAt),
    },
    skippedLaterDeltas: skippedReceiverDeltas,
    missing,
    measures: {
      setPagesReturnedAt: 'performance.now() immediately after setPages for this WHITEBOARD_DELTA. React has not committed the elements yet.',
      afterStageFlushAt: 'performance.now() in KonvaCanvas useLayoutEffect when its elements prop is the same array passed to setPages and the main layer ref is set. React runs descendant layout effects first. react-konva StageWrap flushes the Konva tree and Layer.batchDraw schedules its animation frame inside that child effect, before this timestamp. useElementTransform layout effect on KonvaCanvas runs before this one and returns immediately when no group drag is active. This is not setPages, not the start of rendering, and not Layer.draw.',
      drawStartedAt: 'performance.now() at the start of the first main-layer Layer.draw whose start is at or after afterStageFlushAt.',
      drawEndedAt: 'performance.now() when that Layer.draw call returns. The duration is drawScene plus drawHit for that invocation only.',
      frameAfterDrawAt: 'performance.now() inside the single requestAnimationFrame callback scheduled when that draw returns. This does not measure physical screen presentation.',
    },
  };
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
    retainedCalls: draws.length,
    droppedCalls,
    draws: draws.map((draw) => ({ startedAt: round(draw.startedAt), durationMs: round(draw.durationMs) })),
    sender: senderReport(),
    receiver: receiverReport(),
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
      const ended = performance.now();
      record(started, ended - started);
      noteReceiverDraw(started, ended);
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
  frameToken += 1;
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

function noteReceiverDraw(startedAt: number, endedAt: number): void {
  if (!receiver || receiver.afterStageFlushAt === null || receiver.drawStartedAt !== null) return;
  if (startedAt < receiver.afterStageFlushAt) return;
  receiver.drawStartedAt = startedAt;
  receiver.drawEndedAt = endedAt;
  const token = frameToken;
  requestAnimationFrame(() => {
    if (token !== frameToken || !active || !receiver || receiver.frameAfterDrawAt !== null) return;
    receiver.frameAfterDrawAt = performance.now();
  });
}

/** Arms the sender wait clock. No-op until start(), and a second call does not move the clock. */
export function noteSenderDeltaQueueStart(): void {
  if (!active || senderQueueStart !== 0) return;
  senderQueueStart = performance.now();
}

/** Drops an unused sender wait when the flush ends without publishing a delta. */
export function cancelSenderDeltaQueue(): void {
  senderQueueStart = 0;
}

/** Records sender-local wait for one WHITEBOARD_DELTA. Does not change the payload. */
export function noteSenderDeltaPublished(messageId: string): void {
  if (!active) return;
  const now = performance.now();
  const started = senderQueueStart;
  senderQueueStart = 0;
  if (sender) {
    skippedSenderDeltas += 1;
    return;
  }
  sender = { messageId, queueMs: started === 0 ? null : now - started };
}

/** Records the first remote WHITEBOARD_DELTA after start() or reset(). Later deltas are counted and ignored. */
export function noteReceiverDelta(messageId: string, elements: readonly unknown[]): void {
  if (!active || !messageId) return;
  if (receiver) {
    skippedReceiverDeltas += 1;
    return;
  }
  receiver = {
    messageId,
    elements,
    elementCountAtSetPages: elements.length,
    setPagesReturnedAt: performance.now(),
    afterStageFlushAt: null,
    elementCountAtStageFlush: null,
    drawStartedAt: null,
    drawEndedAt: null,
    frameAfterDrawAt: null,
  };
}

/**
 * Called from KonvaCanvas's layout effect. Stamps only when `elements` is the
 * same array passed to setPages for the open delta.
 */
export function noteReceiverElementsSeen(elements: readonly unknown[]): void {
  if (!active || !receiver || receiver.afterStageFlushAt !== null) return;
  if (elements !== receiver.elements) return;
  receiver.afterStageFlushAt = performance.now();
  receiver.elementCountAtStageFlush = elements.length;
}

function disposeProbeModule(): void {
  for (const layer of layers) detach(layer);
  layers.clear();
  active = false;
  clearTrial();
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
    calls: () => draws.map((draw) => draw.durationMs),
    stop,
  };
  (window as Window & { __wbMainLayerDraw?: DrawApi }).__wbMainLayerDraw = api;
}
