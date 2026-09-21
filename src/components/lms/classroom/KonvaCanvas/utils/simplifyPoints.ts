
function sqSegDist(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number {
    let x = x1;
    let y = y1;
    let dx = x2 - x1;
    let dy = y2 - y1;
  
    if (dx !== 0 || dy !== 0) {
      const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = x2;
        y = y2;
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
  
    dx = px - x;
    dy = py - y;
    return dx * dx + dy * dy;
  }
  
  /** Recursive core. `first` and `last` are point indices, not flat indices. */
  function rdp(
    flat: number[],
    first: number,
    last: number,
    sqTol: number,
    out: number[],
  ): void {
    let maxSq = sqTol;
    let idx = -1;
    const x1 = flat[first * 2];
    const y1 = flat[first * 2 + 1];
    const x2 = flat[last * 2];
    const y2 = flat[last * 2 + 1];
  
    for (let i = first + 1; i < last; i++) {
      const sq = sqSegDist(flat[i * 2], flat[i * 2 + 1], x1, y1, x2, y2);
      if (sq > maxSq) {
        idx = i;
        maxSq = sq;
      }
    }
  
    if (idx !== -1) {
      if (idx - first > 1) rdp(flat, first, idx, sqTol, out);
      out.push(flat[idx * 2], flat[idx * 2 + 1]);
      if (last - idx > 1) rdp(flat, idx, last, sqTol, out);
    }
  }

  export function simplifyPoints(flat: number[], tolerance = 1.5): number[] {
    const n = flat.length;
    if (n <= 6) return flat.slice(); // 0, 1 or 2 points — nothing to do
  
    const sqTol = tolerance * tolerance;
    const out: number[] = [flat[0], flat[1]];
    rdp(flat, 0, n / 2 - 1, sqTol, out);
    out.push(flat[n - 2], flat[n - 1]);
    return out;
  }