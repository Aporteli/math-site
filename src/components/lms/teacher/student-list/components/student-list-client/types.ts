import type { Dispatch, SetStateAction, TransitionStartFunction } from 'react';
import type { PaymentRecord, PriceType, StudentGroup, StudentRecord } from '../../studentList.types';

export interface StudentListClientProps {
  initialStudents: StudentRecord[];
  groups: StudentGroup[];
  initialPayments?: PaymentRecord[];
  studentId?: string;
}

export interface CreateIndividualInput {
  firstName: string;
  lastName: string;
  phone?: string;
  parentPhone?: string;
  email?: string;
  monthlyPrice?: number;
  priceType?: PriceType;
  note?: string;
}

export interface PaymentInput {
  studentId: string;
  amount: number;
  paidAt: string;
  method?: 'cash' | 'card' | 'transfer';
  note?: string;
}

export interface HomeGroupInput {
  name: string;
  studentIds: string[];
}

export type MutationResult = { ok: boolean; error?: string };

export type CreateMutationResult = MutationResult & { id?: string };

export type SetStudents = Dispatch<SetStateAction<StudentRecord[]>>;

export type SetPayments = Dispatch<SetStateAction<PaymentRecord[]>>;

export type SetGroups = Dispatch<SetStateAction<StudentGroup[]>>;

export type StartTransition = TransitionStartFunction;
