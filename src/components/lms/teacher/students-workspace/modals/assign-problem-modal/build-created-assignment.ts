import type { StudentAssignment } from '../../types/teacher-workspace.types';
import type { AssignProblemData } from './types';

export function buildCreatedAssignment(
  assignmentId: string | undefined,
  problemData: AssignProblemData,
  safeComment: string,
  resolvedImage: string | null,
): StudentAssignment {
  return {
    id: assignmentId || 'temp-' + Date.now(),
    title: problemData.topic,
    type: 'PROBLEM',
    instructions: safeComment || null,
    status: 'PUBLISHED',
    createdAt: new Date().toISOString(),
    promptTex: problemData.promptTex,
    problemImageUrl: resolvedImage,
    studentAttachmentUrl: null,
    commentCount: safeComment ? 1 : 0,
  };
}
