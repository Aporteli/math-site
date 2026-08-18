import { combinations, permutations } from "mathjs";

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new Error("nonreal");
  return n;
}

function ints(...values: unknown[]) {
  return values.map((value) => {
    const n = num(value);
    if (!Number.isInteger(n)) throw new Error("int");
    return n;
  });
}

function nat(value: unknown, max = 200) {
  const n = ints(value)[0];
  if (n < 0 || n > max) throw new Error("nat");
  return n;
}

function fact(n: number) {
  if (n > 12) throw new Error("fact");
  let p = 1;
  for (let i = 2; i <= n; i += 1) p *= i;
  return p;
}

function isPrimeInt(n: number) {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  const lim = Math.floor(Math.sqrt(n));
  for (let d = 3; d <= lim; d += 2) {
    if (n % d === 0) return false;
  }
  return true;
}

function toRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function toDeg(radians: number) {
  return (radians * 180) / Math.PI;
}

type Fn = (...args: unknown[]) => number;

/** School helpers injected into the CAS scope (not stock math.js names). */
export const CAS_SCHOOL_SCOPE: Record<string, Fn> = {
  secd: (x) => 1 / Math.cos(toRad(num(x))),
  cscd: (x) => 1 / Math.sin(toRad(num(x))),
  cotd: (x) => 1 / Math.tan(toRad(num(x))),
  asecd: (x) => toDeg(Math.acos(1 / num(x))),
  acscd: (x) => toDeg(Math.asin(1 / num(x))),
  acotd: (x) => toDeg(Math.atan(1 / num(x))),
  deg2rad: (x) => toRad(num(x)),
  rad2deg: (x) => toDeg(num(x)),

  choose: (n, k) => num(combinations(num(n), num(k))),
  perm: (n, k) => num(permutations(num(n), num(k))),
  binomial: (n, k) => num(combinations(num(n), num(k))),

  fibonacci: (n) => {
    const k = nat(n, 40);
    let a = 0;
    let b = 1;
    for (let i = 0; i < k; i += 1) {
      const t = a + b;
      a = b;
      b = t;
    }
    return a;
  },
  lucas: (n) => {
    const k = nat(n, 40);
    let a = 2;
    let b = 1;
    if (k === 0) return 2;
    for (let i = 1; i < k; i += 1) {
      const t = a + b;
      a = b;
      b = t;
    }
    return b;
  },
  triangular: (n) => {
    const k = nat(n, 200);
    return (k * (k + 1)) / 2;
  },
  pentagonal: (n) => {
    const k = nat(n, 200);
    return (k * (3 * k - 1)) / 2;
  },
  hexagonal: (n) => {
    const k = nat(n, 200);
    return k * (2 * k - 1);
  },
  tetrahedral: (n) => {
    const k = nat(n, 80);
    return (k * (k + 1) * (k + 2)) / 6;
  },
  squarePyramidal: (n) => {
    const k = nat(n, 80);
    return (k * (k + 1) * (2 * k + 1)) / 6;
  },
  doubleFactorial: (n) => {
    const k = nat(n, 20);
    let p = 1;
    for (let i = k; i > 1; i -= 2) p *= i;
    return p;
  },
  fallingFactorial: (n, k) => {
    const nn = ints(n)[0];
    const kk = nat(k, 12);
    let p = 1;
    for (let i = 0; i < kk; i += 1) p *= nn - i;
    return p;
  },
  risingFactorial: (n, k) => {
    const nn = ints(n)[0];
    const kk = nat(k, 12);
    let p = 1;
    for (let i = 0; i < kk; i += 1) p *= nn + i;
    return p;
  },
  subfactorial: (n) => {
    const k = nat(n, 12);
    let sum = 0;
    let f = 1;
    for (let i = 0; i <= k; i += 1) {
      if (i > 0) f *= i;
      sum += (i % 2 === 0 ? 1 : -1) / f;
    }
    return Math.round(fact(k) * sum);
  },
  multinomial3: (a, b, c) => {
    const aa = nat(a, 12);
    const bb = nat(b, 12);
    const cc = nat(c, 12);
    return fact(aa + bb + cc) / (fact(aa) * fact(bb) * fact(cc));
  },

  totient: (n) => {
    let k = nat(n, 200);
    if (k <= 1) return k === 1 ? 1 : 0;
    let r = k;
    for (let p = 2; p * p <= k; p += 1) {
      if (k % p === 0) {
        while (k % p === 0) k /= p;
        r -= r / p;
      }
    }
    if (k > 1) r -= r / k;
    return r;
  },
  divisorSum: (n) => {
    const k = nat(n, 200);
    if (k === 0) return 0;
    let s = 0;
    for (let d = 1; d * d <= k; d += 1) {
      if (k % d === 0) {
        s += d;
        const other = k / d;
        if (other !== d) s += other;
      }
    }
    return s;
  },
  divisorCount: (n) => {
    const k = nat(n, 200);
    if (k === 0) return 0;
    let c = 0;
    for (let d = 1; d * d <= k; d += 1) {
      if (k % d === 0) {
        c += 1;
        if (d !== k / d) c += 1;
      }
    }
    return c;
  },
  primeQ: (n) => (isPrimeInt(ints(n)[0]) ? 1 : 0),
  evenQ: (n) => (ints(n)[0] % 2 === 0 ? 1 : 0),
  oddQ: (n) => (ints(n)[0] % 2 !== 0 ? 1 : 0),
  coprimeQ: (a, b) => {
    let x = Math.abs(ints(a)[0]);
    let y = Math.abs(ints(b)[0]);
    while (y) {
      const t = y;
      y = x % y;
      x = t;
    }
    return x === 1 ? 1 : 0;
  },
  digitSum: (n) => {
    let k = Math.abs(ints(n)[0]);
    let s = 0;
    while (k > 0) {
      s += k % 10;
      k = Math.floor(k / 10);
    }
    return s;
  },
  digitCount: (n) => String(Math.abs(ints(n)[0])).length,
  powmod: (base, exp, m) => {
    let b = ((ints(base)[0] % num(m)) + num(m)) % num(m);
    let e = nat(exp, 40);
    const mod = nat(m, 1e6);
    if (mod === 0) throw new Error("mod");
    let r = 1;
    while (e > 0) {
      if (e % 2 === 1) r = (r * b) % mod;
      b = (b * b) % mod;
      e = Math.floor(e / 2);
    }
    return r;
  },
  floorDiv: (a, b) => Math.floor(num(a) / num(b)),
  ceilDiv: (a, b) => Math.ceil(num(a) / num(b)),
  absDiff: (a, b) => Math.abs(num(a) - num(b)),
  quotient: (a, b) => Math.trunc(num(a) / num(b)),

  triangleArea: (base, height) => (num(base) * num(height)) / 2,
  heron: (a, b, c) => {
    const aa = num(a);
    const bb = num(b);
    const cc = num(c);
    const s = (aa + bb + cc) / 2;
    return Math.sqrt(s * (s - aa) * (s - bb) * (s - cc));
  },
  rectArea: (w, h) => num(w) * num(h),
  rectPerimeter: (w, h) => 2 * (num(w) + num(h)),
  squareArea: (s) => num(s) * num(s),
  squarePerimeter: (s) => 4 * num(s),
  trapezoidArea: (a, b, h) => ((num(a) + num(b)) * num(h)) / 2,
  parallelogramArea: (b, h) => num(b) * num(h),
  rhombusArea: (d1, d2) => (num(d1) * num(d2)) / 2,
  cubeVolume: (s) => num(s) ** 3,
  cubeSurface: (s) => 6 * num(s) * num(s),
  cuboidVolume: (l, w, h) => num(l) * num(w) * num(h),
  cuboidSurface: (l, w, h) =>
    2 * (num(l) * num(w) + num(w) * num(h) + num(h) * num(l)),
  pythagHyp: (a, b) => Math.hypot(num(a), num(b)),
  pythagLeg: (c, a) => Math.sqrt(num(c) * num(c) - num(a) * num(a)),
  distance2: (x1, y1, x2, y2) => Math.hypot(num(x2) - num(x1), num(y2) - num(y1)),
  distance3: (x1, y1, z1, x2, y2, z2) =>
    Math.hypot(num(x2) - num(x1), num(y2) - num(y1), num(z2) - num(z1)),
  hypot3: (a, b, c) => Math.hypot(num(a), num(b), num(c)),
  trianglePerimeter: (a, b, c) => num(a) + num(b) + num(c),
  manhattan2: (x1, y1, x2, y2) =>
    Math.abs(num(x2) - num(x1)) + Math.abs(num(y2) - num(y1)),
  manhattan3: (x1, y1, z1, x2, y2, z2) =>
    Math.abs(num(x2) - num(x1)) +
    Math.abs(num(y2) - num(y1)) +
    Math.abs(num(z2) - num(z1)),
  chebyshev2: (x1, y1, x2, y2) =>
    Math.max(Math.abs(num(x2) - num(x1)), Math.abs(num(y2) - num(y1))),
  rightArea: (a, b) => (num(a) * num(b)) / 2,
  prismVolume: (base, height) => num(base) * num(height),
  pyramidVolume: (base, height) => (num(base) * num(height)) / 3,
  circlePi: (r) => num(r) * num(r),
  spherePi: (r) => (4 / 3) * num(r) ** 3,
  sphereSurfPi: (r) => 4 * num(r) * num(r),
  conePi: (r, h) => (num(r) * num(r) * num(h)) / 3,
  cylinderPi: (r, h) => num(r) * num(r) * num(h),

  percentOf: (value, percent) => (num(value) * num(percent)) / 100,
  percentWhat: (part, whole) => (num(part) / num(whole)) * 100,
  percentChange: (from, to) => ((num(to) - num(from)) / num(from)) * 100,
  increaseBy: (value, percent) => num(value) * (1 + num(percent) / 100),
  decreaseBy: (value, percent) => num(value) * (1 - num(percent) / 100),
  lerp: (a, b, t) => num(a) + (num(b) - num(a)) * num(t),
  clamp: (x, lo, hi) => Math.min(num(hi), Math.max(num(lo), num(x))),
  discriminant: (a, b, c) => num(b) * num(b) - 4 * num(a) * num(c),
  quadraticRootP: (a, b, c) => {
    const aa = num(a);
    const bb = num(b);
    const cc = num(c);
    return (-bb + Math.sqrt(bb * bb - 4 * aa * cc)) / (2 * aa);
  },
  quadraticRootM: (a, b, c) => {
    const aa = num(a);
    const bb = num(b);
    const cc = num(c);
    return (-bb - Math.sqrt(bb * bb - 4 * aa * cc)) / (2 * aa);
  },
  arithNth: (a, d, n) => num(a) + (num(n) - 1) * num(d),
  arithSum: (a, d, n) => {
    const nn = num(n);
    return (nn / 2) * (2 * num(a) + (nn - 1) * num(d));
  },
  geoNth: (a, r, n) => num(a) * num(r) ** (num(n) - 1),
  geoSum: (a, r, n) => {
    const rr = num(r);
    const nn = num(n);
    if (rr === 1) return num(a) * nn;
    return (num(a) * (rr ** nn - 1)) / (rr - 1);
  },
  midpoint: (a, b) => (num(a) + num(b)) / 2,
  slope: (x1, y1, x2, y2) => (num(y2) - num(y1)) / (num(x2) - num(x1)),
  lineAt: (m, x, b) => num(m) * num(x) + num(b),
  rss2: (a, b) => num(a) * num(a) + num(b) * num(b),
  inv: (x) => 1 / num(x),
  pow2: (x) => num(x) * num(x),
  pow10: (x) => 10 ** num(x),
  simpleInterest: (p, r, t) => (num(p) * num(r) * num(t)) / 100,
  heaviside: (x) => (num(x) >= 0 ? 1 : 0),
  celsiusToF: (c) => (num(c) * 9) / 5 + 32,
  fahrenheitToC: (f) => ((num(f) - 32) * 5) / 9,
};

export const CAS_SCHOOL_FUNCTIONS = Object.keys(CAS_SCHOOL_SCOPE) as [
  string,
  ...string[],
];
