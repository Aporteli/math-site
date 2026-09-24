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

/** გამოტოვებული გაკვეთილი — კონკრეტული lesson slot კონკრეტულ თარიღზე */
export interface MissedLesson {
  lessonId: string;
  date: string; // "YYYY-MM-DD"
}

export interface StudentRecord {
  id: string;
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
  /** გამოტოვებული გაკვეთილები (PER_LESSON-ისთვის) */
  missedLessons?: MissedLesson[];
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  monthKey: string;
  amount: number;
  paidAt: string;
  method?: 'cash' | 'card' | 'transfer';
  note?: string;
}

export type ContentTab = 'list' | 'calendar';