/**
 * აბრუნებს "ლამაზ" max-ს (მრგვალი რიცხვი) და 4-5 tick-ს.
 * მაგ: 137 → max: 150, ticks: [0, 50, 100, 150]
 */
export function getNiceScale(maxValue: number): { max: number; ticks: number[] } {
  if (maxValue <= 0) {
    return { max: 100, ticks: [0, 25, 50, 75, 100] };
  }

  const TARGET_TICKS = 4;
  const rawStep = maxValue / TARGET_TICKS;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;

  let step: number;
  if (norm <= 1) step = 1 * mag;
  else if (norm <= 2) step = 2 * mag;
  else if (norm <= 2.5) step = 2.5 * mag;
  else if (norm <= 5) step = 5 * mag;
  else step = 10 * mag;

  const niceMax = Math.ceil(maxValue / step) * step;
  const tickCount = Math.round(niceMax / step);

  const ticks: number[] = [];
  for (let i = 0; i <= tickCount; i++) {
    ticks.push(i * step);
  }

  return { max: niceMax, ticks };
}

/** კომპაქტური რიცხვის ფორმატი: 150, 1.2k, 15k */
export function formatCompactCurrency(value: number): string {
  if (value === 0) return '0';
  if (value >= 1000) {
    const k = value / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k ₾`;
  }
  return `${Math.round(value)} ₾`;
}

export function emptyMethodTotals() {
  return {
    cash: { count: 0, amount: 0 },
    card: { count: 0, amount: 0 },
    transfer: { count: 0, amount: 0 },
  };
}
