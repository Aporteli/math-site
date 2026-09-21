// KonvaCanvas/utils/recognize/recognizePolygon.ts
import {
    detectCornersExact,
    sideLengths,
    interiorAngles,
    dist,
    polygonArea,
  } from './geometry';
  import type { Pt } from './geometry';
  
  /** დასაშვები ფარდობითი შეცდომა გვერდების სიგრძეებში (მართკუთხედისთვის). */
  const SIDE_TOL = 0.22;
  
  /** კვადრატის ტოლერანტობა — ხელით ხატვისას გვერდები 55%-მდე განსხვავდება. */
  const SQUARE_SNAP_TOL = 0.55;
  
  /** rotation-ის დასაშვები გადახრა ღერძების მიმართ. თუ ფორმის დახრა
   *  ამაზე ნაკლებია, ის "სწორად" ითვლება და rotation = 0. */
  const AXIS_SNAP_DEG = 22;
  
  /** დასაშვები გადახრა კუთხის 90°-დან (რადიანებში) ≈ 18°. */
  const RIGHT_ANGLE_TOL = 0.32;
  
  /** დასაშვები გადახრა პარალელურობიდან კუთხეებში. */
  const PARALLEL_ANGLE_TOL = 0.32;
  
  /** მინიმალური ფართობი — ძალიან პატარა ფორმები არ ვამტკიცოთ. */
  const MIN_AREA = 400;
  
  /** მინიმალური სიგრძე, რომ ხაზად ჩაითვალოს. */
  const MIN_LINE_LENGTH = 40;
  
  /** დასაშვები მაქსიმალური გადახრა სწორი ხაზიდან, სიგრძის წილადად. */
  const LINE_DEVIATION_TOL = 0.06;
  
  export interface RecognizedRect {
    type: 'rect';
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;   // გრადუსებში (Konva-ს სტანდარტი)
    isSquare: boolean;
  }
  
  export interface RecognizedTriangle {
    type: 'triangle';
    points: number[];
  }
  
  export interface RecognizedParallelogram {
    type: 'parallelogram';
    points: number[];
  }
  
  export interface RecognizedLine {
    type: 'line';
    points: number[]; // [x1, y1, x2, y2]
  }
  
  /**
   * ცდილობს შტრიხი იყოს მართკუთხედი ან კვადრატი.
   */
  export function recognizeRect(flat: number[]): RecognizedRect | null {
    const r = detectCornersExact(flat, 4);
    if (!r) return null;
    const corners = r.pts;
  
    const area = polygonArea(corners);
    if (area < MIN_AREA) return null;
  
    // 1) ოთხივე კუთხე ≈ 90°
    const angles = interiorAngles(corners);
    const rightAngle = Math.PI / 2;
    for (const a of angles) {
      if (Math.abs(a - rightAngle) > RIGHT_ANGLE_TOL) return null;
    }
  
    // 2) მოპირდაპირე გვერდები ტოლი
    const sides = sideLengths(corners);
    const avg02 = (sides[0] + sides[2]) / 2;
    const avg13 = (sides[1] + sides[3]) / 2;
    if (avg02 === 0 || avg13 === 0) return null;
    if (Math.abs(sides[0] - sides[2]) / avg02 > SIDE_TOL) return null;
    if (Math.abs(sides[1] - sides[3]) / avg13 > SIDE_TOL) return null;
  
    // 3) კვადრატია? — "სიგანე" და "სიმაღლე" ახლოს არიან.
    const avgAll = (avg02 + avg13) / 2;
    const isSquare = avgAll > 0 && Math.abs(avg02 - avg13) / avgAll < SQUARE_SNAP_TOL;
  
    // 4) ყველაზე ჰორიზონტალური გვერდი — rotation-ის საწყისი
    let bestI = 0;
    let bestAbs = Infinity;
    for (let i = 0; i < 4; i++) {
      const a = corners[(i + 1) % 4];
      const b = corners[i];
      const abs = Math.abs(Math.atan2(a.y - b.y, a.x - b.x));
      if (abs < bestAbs) {
        bestAbs = abs;
        bestI = i;
      }
    }
    const o = [0, 1, 2, 3].map((k) => corners[(bestI + k) % 4]);
  
    // 5) rotation გრადუსებში; snap-ი თუ ფორმა "სწორად" არის დახატული.
    let rotation = (Math.atan2(o[1].y - o[0].y, o[1].x - o[0].x) * 180) / Math.PI;
    if (Math.abs(rotation) < AXIS_SNAP_DEG) {
      rotation = 0;
    }
  
    // 6) ზომა. თუ კვადრატია — გვერდები ტოლდება საშუალოზე.
    let w = dist(o[0], o[1]);
    let h = dist(o[1], o[2]);
    if (isSquare) {
      const side = (w + h) / 2;
      w = side;
      h = side;
    }
  
    // 7) პოზიცია centroid-იდან, რომ ფორმა იქ დარჩეს, სადაც დაიხატა.
    const cx = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
    const cy = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const x = cx - (w / 2) * cos + (h / 2) * sin;
    const y = cy - (w / 2) * sin - (h / 2) * cos;
  
    return { type: 'rect', x, y, width: w, height: h, rotation, isSquare };
  }
  
  /**
   * სამკუთხედის ამომცნობი.
   */
  export function recognizeTriangle(flat: number[]): RecognizedTriangle | null {
    const r = detectCornersExact(flat, 3);
    if (!r) return null;
    const corners = r.pts;
  
    const area = polygonArea(corners);
    if (area < MIN_AREA) return null;
  
    const angles = interiorAngles(corners);
    const sum = angles[0] + angles[1] + angles[2];
    if (Math.abs(sum - Math.PI) > 0.35) return null;
  
    for (const a of angles) {
      if (a < 0.17) return null;
    }
  
    const n = flat.length;
    const gap = Math.hypot(flat[0] - flat[n - 2], flat[1] - flat[n - 1]);
    const perim = sideLengths(corners).reduce((a, b) => a + b, 0);
    if (gap > perim * 0.25) return null;
  
    return {
      type: 'triangle',
      points: corners.flatMap((p) => [p.x, p.y]),
    };
  }
  
  /**
   * პარალელოგრამის ამომცნობი.
   */
  export function recognizeParallelogram(flat: number[]): RecognizedParallelogram | null {
    const r = detectCornersExact(flat, 4);
    if (!r) return null;
    const corners = r.pts;
  
    const area = polygonArea(corners);
    if (area < MIN_AREA) return null;
  
    const sides = sideLengths(corners);
    const avg02 = (sides[0] + sides[2]) / 2;
    const avg13 = (sides[1] + sides[3]) / 2;
    if (avg02 === 0 || avg13 === 0) return null;
    if (Math.abs(sides[0] - sides[2]) / avg02 > SIDE_TOL) return null;
    if (Math.abs(sides[1] - sides[3]) / avg13 > SIDE_TOL) return null;
  
    const angles = interiorAngles(corners);
    if (Math.abs(angles[0] - angles[2]) > PARALLEL_ANGLE_TOL) return null;
    if (Math.abs(angles[1] - angles[3]) > PARALLEL_ANGLE_TOL) return null;
  
    const rightAngle = Math.PI / 2;
    const allRight = angles.every((a) => Math.abs(a - rightAngle) < RIGHT_ANGLE_TOL);
    if (allRight) return null;
  
    return {
      type: 'parallelogram',
      points: corners.flatMap((p) => [p.x, p.y]),
    };
  }
  
  /**
   * სწორი ხაზის ამომცნობი.
   */
  export function recognizeLine(flat: number[]): RecognizedLine | null {
    const n = flat.length / 2;
    if (n < 2) return null;
  
    const x1 = flat[0], y1 = flat[1];
    const x2 = flat[flat.length - 2], y2 = flat[flat.length - 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < MIN_LINE_LENGTH) return null;
  
    let maxDist = 0;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
  
    for (let i = 2; i < flat.length - 2; i += 2) {
      const px = flat[i];
      const py = flat[i + 1];
      const t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
      const tc = Math.max(0, Math.min(1, t));
      const projX = x1 + tc * dx;
      const projY = y1 + tc * dy;
      const d = Math.hypot(px - projX, py - projY);
      if (d > maxDist) maxDist = d;
    }
  
    if (maxDist / len > LINE_DEVIATION_TOL) return null;
  
    return { type: 'line', points: [x1, y1, x2, y2] };
  }
  
  /**
   * "საუკეთესო" მართკუთხედი ოთხი წვეროდან, როცა ზუსტი მართკუთხედიც და
   * პარალელოგრამიც ვერ დადასტურდა. ვიღებთ ღერძების მიმართ ჩარჩოს (bbox).
   */
  export function rectFallback(corners: Pt[]): RecognizedRect {
    const xs = corners.map((p) => p.x);
    const ys = corners.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    let w = maxX - minX;
    let h = maxY - minY;
    const avg = (w + h) / 2;
    const isSquare = avg > 0 && Math.abs(w - h) / avg < SQUARE_SNAP_TOL;
    if (isSquare) {
      w = avg;
      h = avg;
    }
    return {
      type: 'rect',
      x: minX,
      y: minY,
      width: w,
      height: h,
      rotation: 0,
      isSquare,
    };
  }