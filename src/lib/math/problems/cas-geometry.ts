/**
 * Scalar geometry helpers for template `derived` / `formula` (school → olympiad).
 * Names are long on purpose so they do not steal letters teachers use as params
 * (a, b, c, r, R, s, h, alpha, beta, gamma, …).
 */
function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new Error("nonreal");
  return n;
}

function rad(deg: unknown) {
  return (num(deg) * Math.PI) / 180;
}

function sind(deg: unknown) {
  return Math.sin(rad(deg));
}

function cosd(deg: unknown) {
  return Math.cos(rad(deg));
}

function tand(deg: unknown) {
  return Math.tan(rad(deg));
}

function realSqrt(value: number) {
  if (value < -1e-12) throw new Error("nonreal");
  return Math.sqrt(Math.max(0, value));
}

function heronK(a: number, b: number, c: number) {
  const s = (a + b + c) / 2;
  return realSqrt(s * (s - a) * (s - b) * (s - c));
}

type Fn = (...args: unknown[]) => number;

export const CAS_GEOMETRY_SCOPE: Record<string, Fn> = {
  // --- school: plane figures ---
  trianglePerim: (a, b, c) => num(a) + num(b) + num(c),
  semiperimeter: (a, b, c) => (num(a) + num(b) + num(c)) / 2,
  sasArea: (a, b, Cdeg) => (num(a) * num(b) * sind(Cdeg)) / 2,
  asaArea: (a, Bdeg, Cdeg) => {
    const A = 180 - num(Bdeg) - num(Cdeg);
    return (num(a) * num(a) * sind(Bdeg) * sind(Cdeg)) / (2 * sind(A));
  },
  heightToSide: (a, b, c) => (2 * heronK(num(a), num(b), num(c))) / num(a),
  equilateralArea: (a) => (num(a) * num(a) * Math.sqrt(3)) / 4,
  equilateralHeight: (a) => (num(a) * Math.sqrt(3)) / 2,
  isoscelesArea: (equal, base) => {
    const a = num(equal);
    const c = num(base);
    return (c / 4) * realSqrt(4 * a * a - c * c);
  },
  kiteArea: (d1, d2) => (num(d1) * num(d2)) / 2,
  parallelogramPerim: (a, b) => 2 * (num(a) + num(b)),
  rhombusPerim: (side) => 4 * num(side),
  kitePerim: (a, b) => 2 * (num(a) + num(b)),
  trapezoidPerim: (a, b, c, d) => num(a) + num(b) + num(c) + num(d),

  // --- school: circle ---
  circumferencePi: (r) => 2 * num(r),
  arcPi: (r, deg) => (num(r) * num(deg)) / 180,
  sectorPi: (r, deg) => (num(r) * num(r) * num(deg)) / 360,
  chordLength: (r, deg) => 2 * num(r) * sind(num(deg) / 2),
  annulusPi: (R, r) => num(R) * num(R) - num(r) * num(r),
  inscribedAngle: (arcDeg) => num(arcDeg) / 2,
  centralAngle: (arcDeg) => num(arcDeg),

  // --- school: solids (pi-coefficients stay without π) ---
  coneLateralPi: (r, l) => num(r) * num(l),
  cylinderLateralPi: (r, h) => 2 * num(r) * num(h),
  frustumPi: (R, r, h) =>
    (num(h) * (num(R) * num(R) + num(R) * num(r) + num(r) * num(r))) / 3,
  tetraVolume: (a) => num(a) ** 3 / (6 * Math.sqrt(2)),
  octaVolume: (a) => (Math.sqrt(2) / 3) * num(a) ** 3,

  // --- high school: triangle metrics ---
  lawCosSide: (b, c, Adeg) =>
    realSqrt(
      num(b) * num(b) +
        num(c) * num(c) -
        2 * num(b) * num(c) * cosd(Adeg),
    ),
  lawCosCos: (a, b, c) => {
    const aa = num(a);
    const bb = num(b);
    const cc = num(c);
    return (bb * bb + cc * cc - aa * aa) / (2 * bb * cc);
  },
  lawCosAngle: (a, b, c) =>
    (Math.acos(CAS_GEOMETRY_SCOPE.lawCosCos(a, b, c)) * 180) / Math.PI,
  lawSinSide: (a, Adeg, Bdeg) => (num(a) * sind(Bdeg)) / sind(Adeg),
  inradius: (a, b, c) => {
    const aa = num(a);
    const bb = num(b);
    const cc = num(c);
    return heronK(aa, bb, cc) / ((aa + bb + cc) / 2);
  },
  circumradius: (a, b, c) => {
    const aa = num(a);
    const bb = num(b);
    const cc = num(c);
    return (aa * bb * cc) / (4 * heronK(aa, bb, cc));
  },
  exradiusA: (a, b, c) => {
    const aa = num(a);
    const bb = num(b);
    const cc = num(c);
    const s = (aa + bb + cc) / 2;
    return heronK(aa, bb, cc) / (s - aa);
  },
  exradiusB: (a, b, c) => CAS_GEOMETRY_SCOPE.exradiusA(b, a, c),
  exradiusC: (a, b, c) => CAS_GEOMETRY_SCOPE.exradiusA(c, b, a),
  medianTo: (a, b, c) =>
    0.5 * realSqrt(2 * num(b) * num(b) + 2 * num(c) * num(c) - num(a) * num(a)),
  bisectorTo: (b, c, a) => {
    const bb = num(b);
    const cc = num(c);
    const aa = num(a);
    return realSqrt(bb * cc * (1 - (aa * aa) / ((bb + cc) * (bb + cc))));
  },
  areaFromR: (a, b, c) => {
    const aa = num(a);
    const bb = num(b);
    const cc = num(c);
    return (aa * bb * cc) / (4 * CAS_GEOMETRY_SCOPE.circumradius(aa, bb, cc));
  },
  areaFromr: (a, b, c) => {
    const aa = num(a);
    const bb = num(b);
    const cc = num(c);
    return CAS_GEOMETRY_SCOPE.inradius(aa, bb, cc) * ((aa + bb + cc) / 2);
  },

  // --- high school: regular polygons ---
  regularPerim: (n, side) => num(n) * num(side),
  apothem: (n, side) => num(side) / (2 * tand(180 / num(n))),
  regularArea: (n, side) =>
    (num(n) * num(side) * num(side)) / (4 * tand(180 / num(n))),
  hexagonArea: (side) => ((3 * Math.sqrt(3)) / 2) * num(side) * num(side),
  pentagonArea: (side) =>
    (0.25 * num(side) * num(side) * Math.sqrt(5 * (5 + 2 * Math.sqrt(5)))),

  // --- high school: 3D diagonals ---
  rectDiag: (l, w) => Math.hypot(num(l), num(w)),
  cuboidDiag: (l, w, h) => Math.hypot(num(l), num(w), num(h)),
  faceDiag: (a, b) => Math.hypot(num(a), num(b)),

  // --- olympiad / contest identities ---
  brahmagupta: (a, b, c, d) => {
    const s = (num(a) + num(b) + num(c) + num(d)) / 2;
    return realSqrt(
      (s - num(a)) * (s - num(b)) * (s - num(c)) * (s - num(d)),
    );
  },
  eulerInCircSq: (R, r) => num(R) * (num(R) - 2 * num(r)),
  eulerInCirc: (R, r) => realSqrt(num(R) * (num(R) - 2 * num(r))),
  powerPoint: (d, R) => num(d) * num(d) - num(R) * num(R),
  intersectingChord: (a, b, c) => (num(a) * num(b)) / num(c),
  tangentSecant: (ext, whole) => realSqrt(num(ext) * num(whole)),
  stewartD: (a, b, c, m, n) => {
    const aa = num(a);
    const mm = num(m);
    const nn = num(n);
    return realSqrt((num(b) * num(b) * mm + num(c) * num(c) * nn) / aa - mm * nn);
  },
  ptolemyProd: (ac, bd) => num(ac) * num(bd),
  ptolemySum: (ab, cd, ad, bc) => num(ab) * num(cd) + num(ad) * num(bc),
  shoelace3: (x1, y1, x2, y2, x3, y3) =>
    Math.abs(
      num(x1) * (num(y2) - num(y3)) +
        num(x2) * (num(y3) - num(y1)) +
        num(x3) * (num(y1) - num(y2)),
    ) / 2,
  shoelace4: (x1, y1, x2, y2, x3, y3, x4, y4) =>
    Math.abs(
      num(x1) * num(y2) -
        num(x2) * num(y1) +
        (num(x2) * num(y3) - num(x3) * num(y2)) +
        (num(x3) * num(y4) - num(x4) * num(y3)) +
        (num(x4) * num(y1) - num(x1) * num(y4)),
    ) / 2,
  cross2: (ax, ay, bx, by) =>
    Math.abs(num(ax) * num(by) - num(ay) * num(bx)),
  defectTriangle: (A, B, C) => 180 - (num(A) + num(B) + num(C)),
  excessTriangle: (A, B, C) => num(A) + num(B) + num(C) - 180,
  defectPolygon: (n, angleSum) => (num(n) - 2) * 180 - num(angleSum),
};

/** Usual letters in geometry JSON params, school through olympiad. */
export const GEOMETRY_PARAM_NAMES = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "k",
  "l",
  "m",
  "n",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "ha",
  "hb",
  "hc",
  "ma",
  "mb",
  "mc",
  "wa",
  "wb",
  "wc",
  "la",
  "lb",
  "lc",
  "ra",
  "rb",
  "rc",
  "ab",
  "bc",
  "ca",
  "ad",
  "dc",
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "theta",
  "phi",
  "psi",
  "omega",
  "lambda",
  "mu",
  "rho",
  "sigma",
  "tau",
  "kappa",
  "eta",
] as const;
