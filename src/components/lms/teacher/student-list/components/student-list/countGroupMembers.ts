import type { StudentGroup, StudentRecord } from '../../studentList.types';

export function countGroupMembers(students: StudentRecord[], groups: StudentGroup[]) {
  const counts: Record<string, number> = {};
  for (const group of groups) {
    counts[group.id] = students.filter((s) => s.groupIds.includes(group.id)).length;
  }
  return counts;
}
