import type { Track, TrackProcessor } from 'livekit-client';
import * as vision from '@mediapipe/tasks-vision';

import { TASKS_VISION_WASM, PERSON_CLASS_INDEX, INVERT_CATEGORY_MASK } from './constants';
import { temporalBackgroundSettings } from './index';
import type { TemporalBackgroundOptions, VideoOpts } from './types';
import { createSegmenter } from './utils/createSegmenter';
import { waitForVideoDimensions } from './utils/waitForVideoDimensions';
import { loadImageBitmap } from './utils/loadImageBitmap';
import { drawImageCover } from './utils/drawImageCover';
import { blurConfidence } from './utils/blurConfidence';

export class TemporalBackgroundProcessor
  implements TrackProcessor<Track.Kind.Video>
{
  readonly name = 'temporal-background-processor';
  processedTrack?: MediaStreamTrack;

  private imagePath: string;

  private segmenter?: vision.ImageSegmenter;
  private backgroundImage?: ImageBitmap;

  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D;

  private maskCanvas?: HTMLCanvasElement;
  private maskCtx?: CanvasRenderingContext2D;

  private personCanvas?: HTMLCanvasElement;
  private personCtx?: CanvasRenderingContext2D;

  /**
   * Persistent EMA state. NEVER blurred in place — the blur writes to
   * `blurredConfidence` so this stays clean across frames.
   */
  private smoothedConfidence?: Float32Array;

  /** Scratch buffer: copy of `smoothedConfidence` after the spatial blur. */
  private blurredConfidence?: Float32Array;

  /** Ring of recent raw person-ness frames (unblurred). */
  private confidenceHistory: Float32Array[] = [];

  private width = 0;
  private height = 0;
  private rafId?: number;
  private running = false;
  private source?: HTMLVideoElement;
  private frameCount = 0;

  constructor(options: TemporalBackgroundOptions) {
    this.imagePath = options.imagePath;
  }

  async init(opts: VideoOpts): Promise<void> {
    const video = opts.element as HTMLVideoElement;
    this.source = video;
    await waitForVideoDimensions(video);
    this.width = video.videoWidth;
    this.height = video.videoHeight;

    if (this.width === 0 || this.height === 0) {
      this.width = 640;
      this.height = 360;
    }

    console.log(
      '[TemporalBG] init dims',
      this.width,
      this.height,
      'image',
      this.imagePath,
    );

    const fileset = await vision.FilesetResolver.forVisionTasks(
      TASKS_VISION_WASM,
    );
    this.segmenter = await createSegmenter(fileset);

    this.backgroundImage = await loadImageBitmap(this.imagePath);

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d')!;

    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '1px';
    this.canvas.style.height = '1px';
    this.canvas.style.opacity = '0.01';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '-1';
    document.body.appendChild(this.canvas);

    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.width = 256;
    this.maskCanvas.height = 256;
    this.maskCtx = this.maskCanvas.getContext('2d')!;

    this.personCanvas = document.createElement('canvas');
    this.personCanvas.width = this.width;
    this.personCanvas.height = this.height;
    this.personCtx = this.personCanvas.getContext('2d')!;
    this.personCtx.imageSmoothingEnabled = true;
    this.personCtx.imageSmoothingQuality = 'high';

    if (this.backgroundImage && this.ctx) {
      drawImageCover(this.ctx, this.backgroundImage, this.width, this.height);
    }

    this.processedTrack = this.canvas.captureStream(30).getVideoTracks()[0];

    this.running = true;
    this.rafId = requestAnimationFrame(this.loop);
  }

  async restart(opts: VideoOpts): Promise<void> {
    await this.destroy();
    await this.init(opts);
  }

  async updateBackground(imagePath: string): Promise<void> {
    const next = await loadImageBitmap(imagePath);
    this.backgroundImage?.close();
    this.backgroundImage = next;
    this.imagePath = imagePath;
  }

  async destroy(): Promise<void> {
    this.running = false;
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.rafId = undefined;

    this.processedTrack?.stop();
    this.processedTrack = undefined;

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    this.segmenter?.close();
    this.segmenter = undefined;
    this.backgroundImage?.close();
    this.backgroundImage = undefined;
    this.smoothedConfidence = undefined;
    this.blurredConfidence = undefined;
    this.confidenceHistory = [];
    this.source = undefined;
    this.frameCount = 0;
  }

  private loop = (): void => {
    if (!this.running) return;
    this.processFrame();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private processFrame(): void {
    const { segmenter, source } = this;
    if (!segmenter || !source) return;
    if (source.videoWidth === 0 || source.videoHeight === 0) return;
    if (source.readyState < 2) return;

    try {
      segmenter.segmentForVideo(source, performance.now(), (result) => {
        if (!result) return;

        const confidences = result.confidenceMasks;
        if (confidences && confidences.length > 0) {
          const idx = Math.min(PERSON_CLASS_INDEX, confidences.length - 1);
          const personConfidence = confidences[idx];
          if (personConfidence) {
            this.compositeFromMask(personConfidence, false);
          }
        } else {
          const cat = result.categoryMask;
          if (cat) this.compositeFromMask(cat, INVERT_CATEGORY_MASK);
        }

        result.close();
      });
    } catch (err) {
      console.warn('[TemporalBG] segmentForVideo failed:', err);
    }
  }

  private compositeFromMask(mask: vision.MPMask, invertRaw: boolean): void {
    const {
      ctx,
      canvas,
      backgroundImage,
      width,
      height,
      maskCtx,
      maskCanvas,
      personCtx,
      personCanvas,
      source,
    } = this;

    if (
      !ctx ||
      !canvas ||
      !backgroundImage ||
      !maskCtx ||
      !maskCanvas ||
      !personCtx ||
      !personCanvas ||
      !source
    )
      return;

    const raw = mask.getAsFloat32Array();
    const mw = mask.width;
    const mh = mask.height;

    if (
      !Number.isFinite(mw) ||
      !Number.isFinite(mh) ||
      mw <= 0 ||
      mh <= 0 ||
      raw.length === 0 ||
      raw.length < mw * mh
    ) {
      return;
    }

    // Resize working canvases if needed
    if (maskCanvas.width !== mw || maskCanvas.height !== mh) {
      maskCanvas.width = mw;
      maskCanvas.height = mh;
    }
    if (personCanvas.width !== width || personCanvas.height !== height) {
      personCanvas.width = width;
      personCanvas.height = height;
    }

    const settings = temporalBackgroundSettings;
    const smoothing = settings.smoothing;
    const historyLen = Math.max(
      1,
      Math.min(5, Math.round(settings.historyLength)),
    );
    const blurR = Math.max(0, settings.blurRadius);
    const lo = Math.min(settings.personLow, settings.personHigh);
    const hi = Math.max(settings.personLow, settings.personHigh);
    const span = Math.max(1e-6, hi - lo);

    // ---- 1. Convert raw → personness and push into history ----------------
    const personness = new Float32Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      let v = raw[i];
      if (v < 0) v = 0;
      else if (v > 1) v = 1;
      personness[i] = invertRaw ? 1 - v : v;
    }

    this.confidenceHistory.push(personness);
    while (this.confidenceHistory.length > historyLen) {
      this.confidenceHistory.shift();
    }

    // ---- 2. Temporal average of the history + light EMA -------------------
    if (
      !this.smoothedConfidence ||
      this.smoothedConfidence.length !== raw.length
    ) {
      this.smoothedConfidence = new Float32Array(raw.length);
      // Seed with current frame so we don't start from zeros
      this.smoothedConfidence.set(personness);
    }

    const hist = this.confidenceHistory;
    const invN = 1 / hist.length;
    for (let i = 0; i < raw.length; i++) {
      let sum = 0;
      for (let h = 0; h < hist.length; h++) {
        sum += hist[h][i];
      }
      const avg = sum * invN;

      // Light EMA on top of the multi-frame average for extra stability.
      this.smoothedConfidence[i] =
        this.smoothedConfidence[i] * (1 - smoothing) + avg * smoothing;
    }

    // ---- 3. Spatial blur on a COPY so the EMA state stays clean -----------
    // (If we blurred smoothedConfidence in place, next frame's EMA would mix
    //  in the already-blurred value and the mask would progressively melt.)
    let shapedSource: Float32Array = this.smoothedConfidence;
    if (blurR > 0.1) {
      if (
        !this.blurredConfidence ||
        this.blurredConfidence.length !== raw.length
      ) {
        this.blurredConfidence = new Float32Array(raw.length);
      }
      this.blurredConfidence.set(this.smoothedConfidence);
      blurConfidence(this.blurredConfidence, mw, mh, blurR);
      shapedSource = this.blurredConfidence;
    }

    // ---- 4. Shape into a clean alpha with steep sigmoid -------------------
    const imgData = maskCtx.createImageData(mw, mh);
    const data = imgData.data;
    const smoothed = shapedSource;

    // Steep sigmoid centered between lo/hi. Higher k = sharper edge.
    const k = 14; // 8–10 for softer edges, 14–18 for crisper

    for (let i = 0; i < smoothed.length; i++) {
      const p = smoothed[i];

      // Soft clip into the low/high range
      let t = (p - lo) / span;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;

      // Smoothstep keeps a tiny natural feather
      t = t * t * (3 - 2 * t);

      // Steep sigmoid for final contrast (kills mid-tone flicker)
      const shaped = 1 / (1 + Math.exp(-k * (t - 0.5)));

      const alpha = (shaped * 255 + 0.5) | 0;
      data[i * 4] = 255;
      data[i * 4 + 1] = 255;
      data[i * 4 + 2] = 255;
      data[i * 4 + 3] = alpha;
    }
    maskCtx.putImageData(imgData, 0, 0);

    // ---- 5. Composite -----------------------------------------------------
    personCtx.globalCompositeOperation = 'source-over';
    personCtx.clearRect(0, 0, width, height);
    personCtx.drawImage(source, 0, 0, width, height);

    personCtx.globalCompositeOperation = 'destination-in';
    personCtx.imageSmoothingEnabled = true;
    personCtx.imageSmoothingQuality = 'high';
    personCtx.drawImage(maskCanvas, 0, 0, width, height);

    personCtx.globalCompositeOperation = 'source-over';

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, width, height);
    drawImageCover(ctx, backgroundImage, width, height);
    ctx.drawImage(personCanvas, 0, 0, width, height);

    this.frameCount++;
    if (this.frameCount % 120 === 0) {
      console.log('[TemporalBG] frame', this.frameCount, {
        video: `${source.videoWidth}x${source.videoHeight}`,
        mask: `${mw}x${mh}`,
        history: hist.length,
        blur: blurR,
        low: lo,
        high: hi,
        smoothing,
      });
    }
  }
}
