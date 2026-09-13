export type Difficulty = 'easy' | 'medium' | 'hard' | 'olympiad';
export type ProblemStatus = 'notStarted' | 'uploaded' | 'submitted' | 'graded';
export type StudentContentTab = 'tasks' | 'answers' | 'materials';
export type FilterStatus = 'all' | 'notStarted' | 'inProgress' | 'submitted';

export type AssignmentProblem = {
  id: string;
  promptTex: string;
  topic: string;
  difficulty: Difficulty;
  status: ProblemStatus;
  fileName?: string;
  previewUrl?: string;
  teacherAttachmentUrl?: string | null;
  grade?: number;
  feedback?: string;
};

export type Assignment = {
  id: string;
  title: string;
  type?: string;
  course: string;
  dueLabel?: string;
  createdAt?: string;
  publishedAt?: string;
  overdue?: boolean;
  note?: string;
  instructions?: string;
  attachmentUrl?: string | null;
  problemImageUrl?: string | null;
  customPayload?: any;
  problems: AssignmentProblem[];
};
