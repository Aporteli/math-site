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
  return `${formatPrice(amount)} / ${suffix}`;
}

/* ═══════════════════ Lessons ═══════════════════ */

export function getTodayLessons(lessons: LessonSlot[]): LessonSlot[] {
  const jsDay = new Date().getDay();
  const today = jsDay === 0 ? 7 : jsDay;
  return lessons
    .filter((l) => l.dayOfWeek === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function countTodayLessonSessions(students: StudentRecord[]): number {
  const keys = new Set<string>();
  for (const student of students) {
    for (const lesson of getTodayLessons(student.lessons)) {
      keys.add(
        student.kind === 'individual'
          ? `individual:${student.id}:${lesson.id}`
          : `group:${lesson.groupId}:${lesson.dayOfWeek}:${lesson.startTime}:${lesson.endTime}`,
      );
    }
  }
  return keys.size;
}


export function getGroupName(groupId: string, groups: StudentGroup[]): string {
  return groups.find((g) => g.id === groupId)?.name ?? '—';
}

export interface StudentListSection {
  key: string;
  title: string;
  kind: 'group' | 'individual';
  groupId?: string;
  students: StudentRecord[];
}

export function sectionStudents(
  students: StudentRecord[],
  groups: StudentGroup[],
  preferredGroupId?: string,
): StudentListSection[] {
  const byGroup = new Map<string, StudentRecord[]>();
  const individuals: StudentRecord[] = [];
  const ungrouped: StudentRecord[] = [];

  for (const student of students) {
    if (student.kind === 'individual') {
      individuals.push(student);
      continue;
    }
    const groupId =
      (preferredGroupId && student.groupIds.includes(preferredGroupId)
        ? preferredGroupId
        : student.groupIds.find((id) => groups.some((g) => g.id === id))) ??
      student.groupIds[0];
    if (!groupId) {
      ungrouped.push(student);
      continue;
    }
    const list = byGroup.get(groupId) ?? [];
    list.push(student);
    byGroup.set(groupId, list);
  }

  const sections: StudentListSection[] = [];
  for (const group of groups) {
    const list = byGroup.get(group.id);
    if (!list?.length) continue;
    sections.push({
      key: group.id,
      title: group.name,
      kind: 'group',
      groupId: group.id,
      students: list,
    });
  }

  for (const [groupId, list] of byGroup) {
    if (groups.some((g) => g.id === groupId)) continue;
    sections.push({
      key: groupId,
      title: 'ჯგუფი',
      kind: 'group',
      groupId,
      students: list,
    });
  }

  if (ungrouped.length) {
    sections.push({
      key: '__none',
      title: 'ჯგუფის გარეშე',
      kind: 'group',
      students: ungrouped,
    });
  }
  if (individuals.length) {
    sections.push({
      key: '__individual',
      title: 'სახლში',
      kind: 'individual',
      students: individuals,
    });
  }

  return sections;
}

export function formatPrice(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0;
  const grouped = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${grouped} ₾`;
}

export function paymentStatus(student: StudentRecord): 'paid' | 'partial' | 'unpaid' {
  if (student.paidAmount >= student.monthlyPrice) return 'paid';
  if (student.paidAmount > 0) return 'partial';
  return 'unpaid';
}