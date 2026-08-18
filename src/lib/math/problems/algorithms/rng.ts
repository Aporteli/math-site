export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: () => number, min: number, max: number) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function nonzero(rng: () => number, min: number, max: number) {
  let n = 0;
  while (n === 0) n = randInt(rng, min, max);
  return n;
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error("pick from empty list");
  }
  return items[Math.floor(rng() * items.length)]!;
}

export function shuffle<T>(rng: () => number, items: readonly T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function binomial(n: number, k: number) {
  const r = Math.min(k, n - k);
  let value = 1;
  for (let i = 1; i <= r; i += 1) {
    value = (value * (n - r + i)) / i;
  }
  return Math.round(value);
}

export function factorial(n: number) {
  let value = 1;
  for (let i = 2; i <= n; i += 1) value *= i;
  return value;
}

export function permutations(n: number, k: number) {
  let value = 1;
  for (let i = 0; i < k; i += 1) value *= n - i;
  return value;
}
