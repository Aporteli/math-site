'use client';

import { useState, useTransition } from 'react';
import type { PaymentRecord, StudentGroup, StudentRecord } from '../../studentList.types';
import { addGroupPayment } from './addGroupPayment';
import { addIndividualPayment } from './addIndividualPayment';
import { createHomeGroup } from './createHomeGroup';
import { createIndividualStudent } from './createIndividualStudent';
import { deleteGroupPayment } from './deleteGroupPayment';
import { deleteIndividualPayment } from './deleteIndividualPayment';
import { deleteIndividualStudent } from './deleteIndividualStudent';
import { disbandHomeGroup } from './disbandHomeGroup';
import { toggleMissedLesson } from './toggleMissedLesson';
import type { CreateIndividualInput, HomeGroupInput, PaymentInput, StudentListClientProps } from './types';
import { updateIndividualStudent } from './updateIndividualStudent';
import { updatePayments } from './updatePayments';
import { updatePhones } from './updatePhones';
import { updateStudent } from './updateStudent';

export function useStudentListClient({
  initialStudents,
  groups,
  initialPayments = [],
}: StudentListClientProps) {
  const [students, setStudents] = useState<StudentRecord[]>(initialStudents);
  const [groupList, setGroupList] = useState<StudentGroup[]>(groups);
  const [payments, setPayments] = useState<PaymentRecord[]>(initialPayments);
  const [, startTransition] = useTransition();

  const handleUpdateStudent = (id: string, patch: Partial<StudentRecord>) => {
    updateStudent({ id, patch, students, setStudents, startTransition });
  };

  const handleUpdatePayments = (next: PaymentRecord[]) => {
    updatePayments({ next, payments, setPayments, startTransition });
  };

  const handleUpdatePhones = (
    studentId: string,
    phone: string | null,
    parentPhone: string | null,
    email?: string | null,
  ) => updatePhones({ studentId, phone, parentPhone, email, setStudents });

  const handleCreateIndividual = (draft: CreateIndividualInput) =>
    createIndividualStudent({ draft, setStudents });

  const handleUpdateIndividual = (studentId: string, patch: Partial<StudentRecord>) =>
    updateIndividualStudent({ studentId, patch, setStudents });

  const handleDeleteIndividual = (studentId: string) =>
    deleteIndividualStudent({ studentId, setGroupList, setStudents, setPayments });

  const handleAddGroupPayment = (draft: PaymentInput) => addGroupPayment({ draft, setPayments });

  const handleDeleteGroupPayment = (paymentId: string) => deleteGroupPayment({ paymentId, setPayments });

  const handleAddIndividualPayment = (draft: PaymentInput) => addIndividualPayment({ draft, setPayments });

  const handleDeleteIndividualPayment = (paymentId: string) =>
    deleteIndividualPayment({ paymentId, setPayments });

  const handleToggleMissed = (studentId: string, lessonId: string, date: string, missed: boolean) =>
    toggleMissedLesson({ studentId, lessonId, date, missed, setStudents });

  const handleCreateHomeGroup = (draft: HomeGroupInput) =>
    createHomeGroup({ draft, setGroupList, setStudents });

  const handleDisbandHomeGroup = (groupId: string) => disbandHomeGroup({ groupId, setGroupList, setStudents });

  return {
    students,
    groupList,
    payments,
    handleUpdateStudent,
    handleUpdatePayments,
    handleUpdatePhones,
    handleCreateIndividual,
    handleUpdateIndividual,
    handleDeleteIndividual,
    handleAddGroupPayment,
    handleDeleteGroupPayment,
    handleAddIndividualPayment,
    handleDeleteIndividualPayment,
    handleToggleMissed,
    handleCreateHomeGroup,
    handleDisbandHomeGroup,
  };
}
