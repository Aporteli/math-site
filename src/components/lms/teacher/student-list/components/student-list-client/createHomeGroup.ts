import { createHomeGroupAction } from '@/components/lms/teacher/student-list/actions';
import type { CreateMutationResult, HomeGroupInput, SetGroups, SetStudents } from './types';

export async function createHomeGroup(input: {
  draft: HomeGroupInput;
  setGroupList: SetGroups;
  setStudents: SetStudents;
}): Promise<CreateMutationResult> {
  const { draft, setGroupList, setStudents } = input;
  const res = await createHomeGroupAction(draft);
  if (!res.ok) return { ok: false, error: res.error };

  const id = res.id;
  setGroupList((prev) => [...prev, { id, name: draft.name.trim(), monthlyPrice: 0, home: true }]);
  setStudents((prev) =>
    prev.map((s) =>
      draft.studentIds.includes(s.id)
        ? {
            ...s,
            homeGroupId: id,
            groupIds: [id],
            lessons: s.lessons.map((lesson) => ({ ...lesson, groupId: id })),
          }
        : s,
    ),
  );
  return { ok: true, id };
}
