export const TASKS_VISION_WASM =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

/** MediaPipe selfie segmenter person class index. */
export const PERSON_CLASS_INDEX = 1;

/**
 * Some model outputs treat the category mask as inverted
 * (person = 0). Flip when falling back to categoryMask.
 */
export const INVERT_CATEGORY_MASK = true;
