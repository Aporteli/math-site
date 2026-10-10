import type { StudentRecord } from '../../studentList.types';

export function resolveFreshStudent(selected: StudentRecord | null, students: StudentRecord[]) {
  if (!selected) return null;
  return students.find((s) => s.id === selected.id) ?? selected;
}
