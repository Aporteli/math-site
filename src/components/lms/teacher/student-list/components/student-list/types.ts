import type { PaymentRecord, StudentGroup, StudentRecord } from '../../studentList.types';

export interface StudentListProps {
  students: StudentRecord[];
  groups: StudentGroup[];
  initialPayments?: PaymentRecord[];
  onSelectStudent?: (student: StudentRecord) => void;
  studentId?: string;
  onUpdateStudent?: (id: string, patch: Partial<StudentRecord>) => void;
  onUpdatePayments?: (payments: PaymentRecord[]) => void;
  onUpdatePhones?: (
    studentId: string,
    phone: string | null,
    parentPhone: string | null,
    email?: string | null,
  ) => Promise<{ ok: boolean; error?: string }>;

  onCreateIndividual?: (input: {
    firstName: string;
    lastName: string;
    phone?: string;
    parentPhone?: string;
    email?: string;
    monthlyPrice?: number;
    note?: string;
  }) => Promise<{ ok: boolean; error?: string; id?: string }>;
  onUpdateIndividual?: (studentId: string, patch: Partial<StudentRecord>) => Promise<{ ok: boolean; error?: string }>;
  onDeleteIndividual?: (studentId: string) => Promise<{ ok: boolean; error?: string }>;
  onCreateHomeGroup?: (input: {
    name: string;
    studentIds: string[];
  }) => Promise<{ ok: boolean; error?: string; id?: string }>;
  onDisbandHomeGroup?: (groupId: string) => Promise<{ ok: boolean; error?: string }>;

  /* Group payments (add/delete) */
  onAddGroupPayment?: (input: PaymentInput) => Promise<{ ok: boolean; error?: string }>;
  onDeleteGroupPayment?: (paymentId: string) => Promise<{ ok: boolean; error?: string }>;

  /* Individual payments (add/delete) */
  onAddIndividualPayment?: (input: PaymentInput) => Promise<{ ok: boolean; error?: string }>;
  onDeleteIndividualPayment?: (paymentId: string) => Promise<{ ok: boolean; error?: string }>;

  /* Missed lesson toggle */
  onToggleMissed?: (studentId: string, lessonId: string, date: string, missed: boolean) => void;
}

export type StudentListView = 'table' | 'debt' | 'reports';

export type StudentSection = 'pricing' | 'schedule';

export interface PaymentInput {
  studentId: string;
  amount: number;
  paidAt: string;
  method?: 'cash' | 'card' | 'transfer';
  note?: string;
}

export interface LessonInput {
  studentId: string;
  groupId: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startTime: string;
  endTime: string;
}

export type ActionResult = { ok: boolean; error?: string };

export interface ListStats {
  totalPrice: number;
  totalPaid: number;
  todayCount: number;
  debt: number;
}
