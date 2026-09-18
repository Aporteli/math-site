// KonvaCanvas/utils/recognize/geometry.ts

/** წერტილი სიბრტყეზე. */
export interface Pt {
    x: number;
    y: number;
  }
  
  /** Kåsa-ს least-squares წრის მორგება. */
  export function kasaFit(flat: number[]): { cx: number; cy: number; r: number } | null {
    const n = flat.length / 2;
    let Sx = 0, Sy = 0, Sxx = 0, Syy = 0, Sxy = 0;
    let Sxz = 0, Syz = 0, Sz = 0;
  
    for (let i = 0; i < flat.length; i += 2) {
      const x = flat[i], y = flat[i + 1];
      const z = x * x + y * y;
      Sx += x; Sy += y;
      Sxx += x * x; Syy += y * y; Sxy += x * y;
      Sxz += x * z; Syz += y * z; Sz += z;
    }
  
    const m11 = Sxx, m12 = Sxy, m13 = Sx;
    const m21 = Sxy, m22 = Syy, m23 = Sy;
    const m31 = Sx,  m32 = Sy,  m33 = n;
  
    const det =
        m11 * (m22 * m33 - m23 * m32)
      - m12 * (m21 * m33 - m23 * m31)
      + m13 * (m21 * m32 - m22 * m31);
  
    if (Math.abs(det) < 1e-9) return null;
  
    const a = (Sxz * (m22 * m33 - m23 * m32) - m12 * (Syz * m33 - m23 * Sz) + m13 * (Syz * m32 - m22 * Sz)) / det;
    const b = (m11 * (Syz * m33 - m23 * Sz) - Sxz * (m21 * m33 - m23 * m31) + m13 * (m21 * Sz - Syz * m31)) / det;
    const c = (m11 * (m22 * Sz - Syz * m32) - m12 * (m21 * Sz - Syz * m31) + Sxz * (m21 * m32 - m22 * m31)) / det;
  
    const cx = a / 2, cy = b / 2;
    const rSq = c + cx * cx + cy * cy;
    if (rSq <= 0) return null;
  
    return { cx, cy, r: Math.sqrt(rSq) };
  }
  
  /** Shoelace — ბეჭდის ფართობი. */
  export function polygonArea(pts: Pt[]): number {
    const n = pts.length;
    if (n < 3) return 0;
    let a = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      a += pts[j].x * pts[i].y - pts[i].x * pts[j].y;
    }
    return Math.abs(a) / 2;
  }
  
  /** პერიმეტრი დახურული პოლიგონისთვის. */
  export function polygonPerimeter(pts: Pt[]): number {
    const n = pts.length;
    if (n < 2) return 0;
    let p = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      p += Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
    }
    return p;
  }
  
  /**
   * Ramer–Douglas–Peucker — ამარტივებს პოლილაინს, ინარჩუნებს მხოლოდ
   * მნიშვნელოვან წვეროებს. `epsilon` — მაქსიმალური დასაშვები გადახრა
   * სწორ ხაზამდე (პიქსელებში). უფრო დიდი epsilon → ნაკლები წვერო.
   */
  export function rdp(flat: number[], epsilon: number): number[] {
    const n = flat.length / 2;
    if (n < 3) return flat.slice();
  
    const keep = new Uint8Array(n);
    keep[0] = 1;
    keep[n - 1] = 1;
  
    const stack: Array<[number, number]> = [[0, n - 1]];
  
    while (stack.length > 0) {
      const [start, end] = stack.pop()!;
      if (end - start < 2) continue;
  
      const sx = flat[2 * start], sy = flat[2 * start + 1];
      const ex = flat[2 * end],   ey = flat[2 * end + 1];
      const dx = ex - sx, dy = ey - sy;
      const lenSq = dx * dx + dy * dy;
  
      let maxDist = 0, maxIdx = -1;
      for (let i = start + 1; i < end; i++) {
        const px = flat[2 * i], py = flat[2 * i + 1];
        let d: number;
        if (lenSq === 0) {
          d = Math.hypot(px - sx, py - sy);
        } else {
          const t = ((px - sx) * dx + (py - sy) * dy) / lenSq;
          const tc = Math.max(0, Math.min(1, t));
          d = Math.hypot(px - (sx + tc * dx), py - (sy + tc * dy));
        }
        if (d > maxDist) { maxDist = d; maxIdx = i; }
      }
  
      if (maxDist > epsilon && maxIdx > 0) {
        keep[maxIdx] = 1;
        stack.push([start, maxIdx]);
        stack.push([maxIdx, end]);
      }
    }
  
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      if (keep[i]) {
        out.push(flat[2 * i], flat[2 * i + 1]);
      }
    }
    return out;
  }
  
  /**
   * @deprecated გამოიყენე `detectCornersExact` უფრო საიმედო შედეგისთვის.
   */
  export function detectCorners(flat: number[], epsilon: number): Pt[] {
    const simplified = rdp(flat, epsilon);
    const pts: Pt[] = [];
    for (let i = 0; i < simplified.length; i += 2) {
      pts.push({ x: simplified[i], y: simplified[i + 1] });
    }
    if (pts.length > 2) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      if (Math.hypot(last.x - first.x, last.y - first.y) < epsilon * 3) {
        pts.pop();
      }
    }
    return pts;
  }
  
  /**
   * ერთმანეთთან ახლოს მდებარე წვეროების გაერთიანება (დახურვის კვალის წაშლა).
   */
  export function dedupeCorners(pts: Pt[], minDist: number): Pt[] {
    const out: Pt[] = [];
    for (const q of pts) {
      let dup = false;
      for (const r of out) {
        if (Math.hypot(q.x - r.x, q.y - r.y) < minDist) {
          dup = true;
          break;
        }
      }
      if (!dup) out.push(q);
    }
    return out;
  }
  
  /**
   * ამოწმებს, დახურულია თუ არა შტრიხი — საწყისი და საბოლოო წერტილები
   * ახლოს არიან ერთმანეთთან ფარდობითად (პერიმეტრის წილადად).
   */
  export function isClosedStroke(flat: number[], maxGapRatio: number = 0.3): boolean {
    const n = flat.length;
    if (n < 6) return false;
  
    const gap = Math.hypot(flat[0] - flat[n - 2], flat[1] - flat[n - 1]);
  
    let perim = 0;
    for (let i = 0; i < n - 2; i += 2) {
      perim += Math.hypot(flat[i + 2] - flat[i], flat[i + 3] - flat[i + 1]);
    }
    if (perim === 0) return false;
  
    return gap / perim < maxGapRatio;
  }
  
  /** შედეგი: წვეროები + epsilon, რომელზეც ისინი მოიძებნა. */
  export interface CornerResult {
    pts: Pt[];
    eps: number;
  }
  

  export function detectCornersExact(flat: number[], expected: number): CornerResult | null {
    // ღია შტრიხი არასოდეს არის პოლიგონი — ეს არის freedraw.
    if (!isClosedStroke(flat)) return null;
  
    for (const eps of [6, 8, 10, 12, 16, 20, 26, 34]) {
      const raw = rdp(flat, eps);
      const pts: Pt[] = [];
      for (let i = 0; i < raw.length; i += 2) {
        pts.push({ x: raw[i], y: raw[i + 1] });
      }
      const merged = dedupeCorners(pts, eps * 3);
      if (merged.length === expected) return { pts: merged, eps };
    }
    return null;
  }
  
  /** ორი ვექტორის წერტილოვანი ნამრავლი. */
  export function dot(ax: number, ay: number, bx: number, by: number): number {
    return ax * bx + ay * by;
  }
  
  /** მანძილი ორ წერტილს შორის. */
  export function dist(a: Pt, b: Pt): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }
  
  /** წვეროებიდან გვერდების სიგრძეები (დახურული პოლიგონი). */
  export function sideLengths(pts: Pt[]): number[] {
    const n = pts.length;
    const out: number[] = new Array(n);
    for (let i = 0, j = n - 1; i < n; j = i++) {
      out[i] = dist(pts[j], pts[i]);
    }
    return out;
  }
  
  /**
   * კუთხე (რადიანებში) სამ წვეროს შორის — `mid` არის კუთხის წვერო.
   */
  export function angleAt(prev: Pt, mid: Pt, next: Pt): number {
    const v1x = prev.x - mid.x, v1y = prev.y - mid.y;
    const v2x = next.x - mid.x, v2y = next.y - mid.y;
    const n1 = Math.hypot(v1x, v1y);
    const n2 = Math.hypot(v2x, v2y);
    if (n1 === 0 || n2 === 0) return 0;
    const cos = (v1x * v2x + v1y * v2y) / (n1 * n2);
    return Math.acos(Math.max(-1, Math.min(1, cos)));
  }
  
  /** პოლიგონის ყველა შიდა კუთხე. */
  export function interiorAngles(pts: Pt[]): number[] {
    const n = pts.length;
    const out: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const prev = pts[(i - 1 + n) % n];
      const next = pts[(i + 1) % n];
      out[i] = angleAt(prev, pts[i], next);
    }
    return out;
  }