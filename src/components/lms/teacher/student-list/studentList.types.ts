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
    firstName: string;
    lastName: string;
    phone: string;
    parentPhone?: string;
    email?: string;
    groupIds: string[];
    monthlyPrice: number;
    paidAmount: number;
    lessons: LessonSlot[];
    status: 'active' | 'paused' | 'finished';
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