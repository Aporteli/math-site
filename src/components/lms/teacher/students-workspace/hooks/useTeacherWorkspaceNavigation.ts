'use client';

import { useState, useEffect, useMemo } from 'react';
import type { StudentItem } from '../types/teacher-workspace.types';
import { formatDateToKey, getAssignmentViewKey } from '../helpers/teacher-workspace.helpers';

const STORAGE_KEY = 'mathlab_teacher_viewed_assignments_v2';

interface UseTeacherWorkspaceNavigationProps {
  initialStudents: StudentItem[];
  courses: { id: string; title: string }[];
}

export function useTeacherWorkspaceNavigation({
  initialStudents,
  courses,
}: UseTeacherWorkspaceNavigationProps) {
  const [students, setStudents] = useState<StudentItem[]>(initialStudents);
  const [activeCourseId, setActiveCourseId] = useState<string | 'all'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => formatDateToKey(new Date()));

  // Unread / Viewed LocalStorage
  const [isReady, setIsReady] = useState(false);
  const [viewedKeys, setViewedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setViewedKeys(new Set(parsed));
      }
    } catch (e) {
      console.error('Failed to read viewed keys from localStorage', e);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    let changed = false;
    const next = new Set(viewedKeys);

    for (const student of students) {
      for (const a of student.assignments) {
        const isSubmitted =
          (a.status === 'SUBMITTED' || a.status === 'RETURNED' || Boolean(a.studentAttachmentUrl)) &&
          a.status !== 'GRADED';

        if (!isSubmitted) {
          for (const key of Array.from(next)) {
            if (key.startsWith(`${a.id}:`) || key === a.id) {
              next.delete(key);
              changed = true;
            }
          }
        }
      }
    }

    if (changed) {
      setViewedKeys(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch (e) {}
    }
  }, [students, isReady, viewedKeys]);

  // Selectors
  const filteredCourses = useMemo(
    () => courses.filter((c) => c.title.toLowerCase().includes(classSearchQuery.toLowerCase())),
    [courses, classSearchQuery],
  );

  const studentsInActiveCourse = useMemo(
    () => students.filter((s) => (activeCourseId === 'all' ? true : s.courses.some((c) => c.id === activeCourseId))),
    [students, activeCourseId],
  );

  const activeStudent = students.find((s) => s.id === selectedStudentId);
  const selectedCourseObj = courses.find((c) => c.id === activeCourseId);

  const studentAvailableDates = useMemo(() => {
    if (!activeStudent || !activeStudent.assignments) return [];
    const set = new Set<string>();
    activeStudent.assignments.forEach((a) => {
      set.add(formatDateToKey(new Date(a.createdAt)));
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [activeStudent]);

  useEffect(() => {
    if (studentAvailableDates.length > 0) {
      const todayKey = formatDateToKey(new Date());
      if (!studentAvailableDates.includes(todayKey)) {
        setSelectedDateKey(studentAvailableDates[0]);
      }
    }
  }, [studentAvailableDates]);

  const unreadStudentIds = useMemo(() => {
    if (!isReady) return new Set<string>();
    const ids = new Set<string>();
    for (const student of students) {
      const hasUnread = student.assignments.some((a) => {
        const isSubmitted =
          (a.status === 'SUBMITTED' || a.status === 'RETURNED' || Boolean(a.studentAttachmentUrl)) &&
          a.status !== 'GRADED';
        const key = getAssignmentViewKey(a);
        return isSubmitted && !viewedKeys.has(key);
      });
      if (hasUnread) ids.add(student.id);
    }
    return ids;
  }, [students, viewedKeys, isReady]);

  const handleShiftDate = (days: number) => {
    const parts = selectedDateKey.split('-');
    const current = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    current.setDate(current.getDate() + days);
    setSelectedDateKey(formatDateToKey(current));
  };

  const handleCourseChange = (courseId: string) => {
    setActiveCourseId(courseId);
    setSelectedStudentId(null);
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);

    const student = students.find((s) => s.id === studentId);
    if (student) {
      const newUnreadKeys = student.assignments
        .filter((a) => {
          const isSub =
            (a.status === 'SUBMITTED' || a.status === 'RETURNED' || Boolean(a.studentAttachmentUrl)) &&
            a.status !== 'GRADED';
          const key = getAssignmentViewKey(a);
          return isSub && !viewedKeys.has(key);
        })
        .map((a) => getAssignmentViewKey(a));

      if (newUnreadKeys.length > 0) {
        setViewedKeys((prev) => {
          const next = new Set(prev);
          newUnreadKeys.forEach((key) => next.add(key));
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
          } catch (e) {}
          return next;
        });
      }
    }
  };

  return {
    students,
    setStudents,
    activeCourseId,
    selectedStudentId,
    classSearchQuery,
    setClassSearchQuery,
    selectedDateKey,
    setSelectedDateKey,
    filteredCourses,
    studentsInActiveCourse,
    activeStudent,
    selectedCourseObj,
    unreadStudentIds,
    handleShiftDate,
    handleCourseChange,
    handleStudentSelect,
  };
}