'use client';

import { useState } from 'react';
import type { BankProblem } from '@/lib/math/problems';
import { filterCourseGroups } from './filterCourseGroups';
import { useCourseGroups } from './useCourseGroups';
import { useSendProblem } from './useSendProblem';

export function useClassSendModal(problem: BankProblem) {
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignComment, setAssignComment] = useState('');
  const { courseGroups, expandedCourseIds, isLoadingClasses, toggleCourseExpand } =
    useCourseGroups(isClassModalOpen);
  const {
    sendingClassId,
    sentClassIds,
    sendingStudentId,
    sentStudentIds,
    handleSendToClass,
    handleSendToStudent,
  } = useSendProblem(problem, assignComment);

  const filteredCourseGroups = filterCourseGroups(courseGroups, searchQuery);

  return {
    isClassModalOpen,
    setIsClassModalOpen,
    searchQuery,
    setSearchQuery,
    assignComment,
    setAssignComment,
    expandedCourseIds,
    isLoadingClasses,
    toggleCourseExpand,
    filteredCourseGroups,
    sendingClassId,
    sentClassIds,
    sendingStudentId,
    sentStudentIds,
    handleSendToClass,
    handleSendToStudent,
  };
}
