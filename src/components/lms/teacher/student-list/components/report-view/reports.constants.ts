import { ArrowLeftRight, Banknote, CreditCard } from 'lucide-react';

/* ─── ჩარტის ზომები ─── */
export const CHART_HEIGHT = 180; /* bars area in px */
export const Y_AXIS_WIDTH = 52; /* px — Y labels area */

export const METHOD_LABEL = {
  cash: 'ნაღდი',
  card: 'ბარათი',
  transfer: 'გადარიცხვა',
} as const;

export const METHOD_ICON = {
  cash: Banknote,
  card: CreditCard,
  transfer: ArrowLeftRight,
} as const;

export const METHOD_COLOR = {
  cash: 'text-emerald-600 bg-paper border-hairline',
  card: 'text-sky-600 bg-paper border-hairline',
  transfer: 'text-violet-600 bg-paper border-hairline',
} as const;
