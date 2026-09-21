import * as vision from '@mediapipe/tasks-vision';
import { SELFIE_SEGMENTER_MODEL } from '../background';

type CreateSegmenterOptionsArg = Parameters<
  typeof vision.ImageSegmenter.createFromOptions
>;
type WasmFilesetArg = CreateSegmenterOptionsArg[0];
type ImageSegmenterOptionsArg = CreateSegmenterOptionsArg[1];

/**
 * Create an ImageSegmenter, preferring GPU and falling back to CPU.
 */
export async function createSegmenter(
  fileset: vision.FilesetResolver,
): Promise<vision.ImageSegmenter> {
  const wasmFileset = fileset as unknown as WasmFilesetArg;
  const baseOptions = { modelAssetPath: SELFIE_SEGMENTER_MODEL };
  const options: ImageSegmenterOptionsArg = {
    runningMode: 'VIDEO',
    outputCategoryMask: false,
    outputConfidenceMasks: true,
  };

  try {
    return await vision.ImageSegmenter.createFromOptions(wasmFileset, {
      ...options,
      baseOptions: { ...baseOptions, delegate: 'GPU' },
    });
  } catch (err) {
    console.warn('[TemporalBG] GPU delegate failed, falling back to CPU:', err);
    return await vision.ImageSegmenter.createFromOptions(wasmFileset, {
      ...options,
      baseOptions: { ...baseOptions, delegate: 'CPU' },
    });
  }
}
