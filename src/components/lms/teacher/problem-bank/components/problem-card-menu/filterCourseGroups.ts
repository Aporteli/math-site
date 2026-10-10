import type { CourseGroup } from './types';

export function filterCourseGroups(courseGroups: CourseGroup[], searchQuery: string) {
  return courseGroups.filter(
    (group) =>
      group.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.students.some((student) => student.name.toLowerCase().includes(searchQuery.toLowerCase())),
  );
}
