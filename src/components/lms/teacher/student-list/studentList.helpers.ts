import type { LessonSlot, PriceType, StudentGroup, StudentRecord } from './studentList.types';

export const DAY_LABELS: Record<number, string> = {
  1: 'ორშაბათი', 2: 'სამშაბათი', 3: 'ოთხშაბათი',
  4: 'ხუთშაბათი', 5: 'პარასკევი', 6: 'შაბათი', 7: 'კვირა',
};

export const DAY_SHORT: Record<number, string> = {
  1: 'ორშ', 2: 'სამ', 3: 'ოთხ', 4: 'ხუთ', 5: 'პარ', 6: 'შაბ', 7: 'კვი',
};

/* ═══════════════════ Price Type ═══════════════════ */

export const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  MONTHLY: 'თვიური',
  WEEKLY: 'კვირეული',
  BIWEEKLY: 'ორ კვირაში ერთხელ',
  PER_LESSON: 'თითო გაკვეთილი',
};

export const PRICE_TYPE_SHORT: Record<PriceType, string> = {
  MONTHLY: 'თვე',
  WEEKLY: 'კვირა',
  BIWEEKLY: '2 კვირა',
  PER_LESSON: 'გაკვეთილი',
};

export const PRICE_TYPE_OPTIONS: PriceType[] = [
  'MONTHLY',
  'WEEKLY',
  'BIWEEKLY',
  'PER_LESSON',
];

export function formatPriceWithPeriod(
  amount: number,
  priceType: PriceType = 'MONTHLY',
): string {
  const suffix = PRICE_TYPE_SHORT[priceType];
  return `${amount.toLocaleString('ka-GE')} ₾ / ${suffix}`;
}

/* ═══════════════════ Lessons ═══════════════════ */

export function getTodayLessons(lessons: LessonSlot[]): LessonSlot[] {
  const jsDay = new Date().getDay();
  const today = jsDay === 0 ? 7 : jsDay;
  return lessons
    .filter((l) => l.dayOfWeek === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function getGroupName(groupId: string, groups: StudentGroup[]): string {
  return groups.find((g) => g.id === groupId)?.name ?? '—';
}

export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('ka-GE')} ₾`;
}

export function paymentStatus(student: StudentRecord): 'paid' | 'partial' | 'unpaid' {
  if (student.paidAmount >= student.monthlyPrice) return 'paid';
  if (student.paidAmount > 0) return 'partial';
  return 'unpaid';
}