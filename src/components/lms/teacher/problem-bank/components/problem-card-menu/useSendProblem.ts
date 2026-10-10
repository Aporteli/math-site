'use client';

import { useState } from 'react';
import type { BankProblem } from '@/lib/math/problems';
import { sendProblemToClassAction, sendProblemToStudentAction } from '@/lib/actions/students';
import { buildProblemPayload } from './buildProblemPayload';
import type { CourseGroup } from './types';

export function useSendProblem(problem: BankProblem, assignComment: string) {
  const [sendingClassId, setSendingClassId] = useState<string | null>(null);
  const [sentClassIds, setSentClassIds] = useState<string[]>([]);
  const [sendingStudentId, setSendingStudentId] = useState<string | null>(null);
  const [sentStudentIds, setSentStudentIds] = useState<string[]>([]);

  async function handleSendToClass(cls: CourseGroup) {
    if (sentClassIds.includes(cls.id) || sendingClassId) return;

    setSendingClassId(cls.id);
    try {
      const res = await sendProblemToClassAction({
        courseId: cls.id,
        instructions: assignComment.trim() || undefined,
        problem: buildProblemPayload(problem),
      });

      if (res.success) {
        setSentClassIds((prev) => [...prev, cls.id]);
      }
    } finally {
      setSendingClassId(null);
    }
  }

  async function handleSendToStudent(student: { id: string; name: string }) {
    if (sentStudentIds.includes(student.id) || sendingStudentId) return;

    setSendingStudentId(student.id);
    try {
      const res = await sendProblemToStudentAction({
        studentId: student.id,
        instructions: assignComment.trim() || undefined,
        problem: buildProblemPayload(problem),
      });

      if (res.success) {
        setSentStudentIds((prev) => [...prev, student.id]);
      }
    } finally {
      setSendingStudentId(null);
    }
  }

  return {
    sendingClassId,
    sentClassIds,
    sendingStudentId,
    sentStudentIds,
    handleSendToClass,
    handleSendToStudent,
  };
}
