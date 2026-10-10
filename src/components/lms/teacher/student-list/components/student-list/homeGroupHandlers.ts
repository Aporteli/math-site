import type { StudentGroup } from '../../studentList.types';
import type { StudentListProps } from './types';

export async function disbandHomeGroup(
  groupId: string,
  groups: StudentGroup[],
  onDisbandHomeGroup: StudentListProps['onDisbandHomeGroup'],
) {
  const group = groups.find((g) => g.id === groupId);
  const name = group?.name ?? 'ჯგუფი';
  if (!window.confirm(`დავშალოთ „${name}“? მოსწავლეები და მათი გადახდები დარჩება.`)) return;
  const res = await onDisbandHomeGroup?.(groupId);
  if (res && !res.ok) window.alert(res.error ?? 'ჯგუფის დაშლა ვერ მოხერხდა');
}

export async function submitHomeGroup(input: {
  homeGroupName: string;
  homeGroupStudentIds: string[];
  onCreateHomeGroup: StudentListProps['onCreateHomeGroup'];
  setHomeGroupError: (value: string | null) => void;
  setHomeGroupSaving: (value: boolean) => void;
  setHomeGroupOpen: (value: boolean) => void;
  setHomeGroupName: (value: string) => void;
  setHomeGroupStudentIds: (value: string[]) => void;
}) {
  const {
    homeGroupName,
    homeGroupStudentIds,
    onCreateHomeGroup,
    setHomeGroupError,
    setHomeGroupSaving,
    setHomeGroupOpen,
    setHomeGroupName,
    setHomeGroupStudentIds,
  } = input;

  setHomeGroupError(null);
  const name = homeGroupName.trim();
  if (!name) {
    setHomeGroupError('ჯგუფის სახელი სავალდებულოა');
    return;
  }
  if (homeGroupStudentIds.length < 2) {
    setHomeGroupError('აირჩიე მინიმუმ ორი მოსწავლე');
    return;
  }
  setHomeGroupSaving(true);
  const res = await onCreateHomeGroup?.({ name, studentIds: homeGroupStudentIds });
  setHomeGroupSaving(false);
  if (!res?.ok) {
    setHomeGroupError(res?.error ?? 'ჯგუფის შექმნა ვერ მოხერხდა');
    return;
  }
  setHomeGroupOpen(false);
  setHomeGroupName('');
  setHomeGroupStudentIds([]);
}
