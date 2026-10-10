import type { PaymentRecord, StudentGroup, StudentRecord } from '../../studentList.types';

export interface ReportsViewProps {
  students: StudentRecord[];
  groups: StudentGroup[];
  payments: PaymentRecord[];
  monthKey: string;
  onMonthChange: (key: string) => void;
}

export type ReportsMode = 'monthly' | 'yearly';

export type PaymentMethod = 'cash' | 'card' | 'transfer';

export type MethodTotals = Record<PaymentMethod, { count: number; amount: number }>;

export interface MonthlyStudentRow {
  student: StudentRecord;
  paid: number;
  count: number;
}

export interface MonthlyReportData {
  totalPaid: number;
  paymentCount: number;
  byMethod: MethodTotals;
  byStudent: MonthlyStudentRow[];
  dailyIncome: number[];
  maxDaily: number;
  daysInMonth: number;
}

export interface MonthStat {
  label: string;
  monthIndex: number;
  monthKey: string;
  total: number;
  count: number;
}

export interface YearlyStudentRow {
  student: StudentRecord;
  paid: number;
}

export interface YearlyReportData {
  monthStats: MonthStat[];
  yearTotal: number;
  yearCount: number;
  maxMonth: number;
  avgMonth: number;
  best: MonthStat;
  byMethod: MethodTotals;
  byStudent: YearlyStudentRow[];
}
