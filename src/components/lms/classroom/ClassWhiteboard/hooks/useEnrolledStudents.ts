'use client';

import { useEffect, useState } from 'react';
import { getEnrolledCourseStudentsAction } from '@/lib/actions/students';
import type { Student } from '../types';

export function useEnrolledStudents(courseId: string, isTeacher: boolean) {
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (!isTeacher) return;
    let cancelled = false;
    void getEnrolledCourseStudentsAction(courseId).then((list) => {
      if (cancelled) return;
      setStudents(list.map((s) => ({ identity: s.id, name: s.name })));
    });
    return () => {
      cancelled = true;
    };
  }, [isTeacher, courseId]);

  return { students, setStudents };
}