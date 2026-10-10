import { disbandHomeGroupAction } from '@/components/lms/teacher/student-list/actions';
import type { MutationResult, SetGroups, SetStudents } from './types';

export async function disbandHomeGroup(input: {
  groupId: string;
  setGroupList: SetGroups;
  setStudents: SetStudents;
}): Promise<MutationResult> {
  const { groupId, setGroupList, setStudents } = input;
  const res = await disbandHomeGroupAction({ groupId });
  if (!res.ok) return { ok: false, error: res.error };

  setGroupList((prev) => prev.filter((g) => g.id !== groupId));
  setStudents((prev) =>
    prev.map((s) =>
      s.homeGroupId === groupId
        ? {
            ...s,
            homeGroupId: undefined,
            groupIds: [],
            lessons: s.lessons.map((lesson) => ({ ...lesson, groupId: '' })),
          }
        : s,
    ),
  );
  return { ok: true };
}
