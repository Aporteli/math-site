export const SELFIE_SEGMENTER_MODEL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite';

/** Used by the LiveKit blur processor; the virtual-background processor has its own GPU→CPU fallback. */
export const SELFIE_SEGMENTER_DELEGATE = 'GPU' as const;