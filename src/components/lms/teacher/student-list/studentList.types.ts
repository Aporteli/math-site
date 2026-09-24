export type PriceType = 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'PER_LESSON';

export interface LessonSlot {
  id: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startTime: string;
  endTime: string;
  groupId: string;
}

export interface StudentGroup {
  id: string;
  name: string;
  monthlyPrice: number;
}

export interface StudentRecord {
  id: string;
  /** 'group' = ჯგუფის მოსწავლე (User + Enrollment) — 'individual' = ცალკე მოსწავლე ბაზაში რეგისტრაციის გარეშე */
  kind: 'group' | 'individual';
  firstName: string;
  lastName: string;
  phone: string;
  parentPhone?: string;
  email?: string;
  groupIds: string[];
  monthlyPrice: number;
  priceType?: PriceType;
  paidAmount: number;
  lessons: LessonSlot[];
  status: 'active' | 'paused' | 'finished';
  note?: string;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  monthKey: string; // "2026-09"
  amount: number;
  paidAt: string;
  method?: 'cash' | 'card' | 'transfer';
  note?: string;
}

export type ContentTab = 'list' | 'calendar';