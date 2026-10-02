/** Prefix buffer reused across frames. The blur runs on the main thread, one call at a time. */
let prefix = new Float64Array(0);

function prefixBuffer(length: number): Float64Array {
  if (prefix.length < length) prefix = new Float64Array(length);
  return prefix;
}

/**
 * Separable box blur on a Float32Array confidence map (in-place).
 * Prefix sums keep each pass linear in the pixel count.
 */
export function blurConfidence(
  data: Float32Array,
  w: number,
  h: number,
  radius: number,
): void {
  const r = Math.max(1, Math.round(radius));
  const tmp = new Float32Array(data.length);
  const sums = prefixBuffer(Math.max(w, h) + 1);

  for (let y = 0; y < h; y++) {
    const row = y * w;
    sums[0] = 0;
    for (let x = 0; x < w; x++) sums[x + 1] = sums[x] + data[row + x];
    for (let x = 0; x < w; x++) {
      const x0 = x - r > 0 ? x - r : 0;
      const x1 = x + r < w ? x + r : w - 1;
      tmp[row + x] = (sums[x1 + 1] - sums[x0]) / (x1 - x0 + 1);
    }
  }

  for (let x = 0; x < w; x++) {
    sums[0] = 0;
    for (let y = 0; y < h; y++) sums[y + 1] = sums[y] + tmp[y * w + x];
    for (let y = 0; y < h; y++) {
      const y0 = y - r > 0 ? y - r : 0;
      const y1 = y + r < h ? y + r : h - 1;
      data[y * w + x] = (sums[y1 + 1] - sums[y0]) / (y1 - y0 + 1);
    }
  }
}
