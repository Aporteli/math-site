'use client';

import { useEffect, useState } from 'react';
import { getTeacherStudentsAction } from '@/lib/actions/teacher-students';
import type { CourseGroup } from './types';

export function useCourseGroups(isClassModalOpen: boolean) {
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([]);
  const [expandedCourseIds, setExpandedCourseIds] = useState<string[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);

  useEffect(() => {
    if (!isClassModalOpen) return;

    let isMounted = true;
    async function loadClasses() {
      setIsLoadingClasses(true);
      try {
        const res = await getTeacherStudentsAction();
        if (isMounted) {
          setCourseGroups(
            (res.success && res.courseGroups ? res.courseGroups : [])
              .slice()
              .sort((a, b) => a.title.localeCompare(b.title)),
          );
          setExpandedCourseIds([]);
        }
      } finally {
        if (isMounted) setIsLoadingClasses(false);
      }
    }

    loadClasses();
    return () => {
      isMounted = false;
    };
  }, [isClassModalOpen]);

  function toggleCourseExpand(courseId: string) {
    setExpandedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId],
    );
  }

  return { courseGroups, expandedCourseIds, isLoadingClasses, toggleCourseExpand };
}
