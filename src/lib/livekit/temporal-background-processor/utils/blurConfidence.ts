/**
 * Cheap separable box blur on a Float32Array confidence map (in-place).
 */
export function blurConfidence(
  data: Float32Array,
  w: number,
  h: number,
  radius: number,
): void {
  const r = Math.max(1, Math.round(radius));
  const tmp = new Float32Array(data.length);

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w - 1, x + r);
      for (let i = x0; i <= x1; i++) {
        sum += data[row + i];
        count++;
      }
      tmp[row + x] = sum / count;
    }
  }

  // Vertical pass
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      let count = 0;
      const y0 = Math.max(0, y - r);
      const y1 = Math.min(h - 1, y + r);
      for (let j = y0; j <= y1; j++) {
        sum += tmp[j * w + x];
        count++;
      }
      data[y * w + x] = sum / count;
    }
  }
}
