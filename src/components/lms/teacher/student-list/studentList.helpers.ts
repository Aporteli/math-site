import type { LessonSlot, StudentGroup, StudentRecord } from './studentList.types';

export const DAY_LABELS: Record<number, string> = {
  1: 'ორშაბათი', 2: 'სამშაბათი', 3: 'ოთხშაბათი',
  4: 'ხუთშაბათი', 5: 'პარასკევი', 6: 'შაბათი', 7: 'კვირა',
};

export const DAY_SHORT: Record<number, string> = {
  1: 'ორშ', 2: 'სამ', 3: 'ოთხ', 4: 'ხუთ', 5: 'პარ', 6: 'შაბ', 7: 'კვი',
};

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