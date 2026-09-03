export type ContentTab = 'tasks' | 'answers' | 'materials';

export interface StudentAssignment {
  id: string;
  submissionId?: string;
  title: string;
  type: string;
  instructions?: string | null;
  status: string;
  createdAt: string;
  promptTex?: string;
  problemImageUrl?: string | null;
  studentAttachmentUrl?: string | null;
  commentCount: number;
}

export interface StudentItem {
  id: string;
  name: string;
  email?: string;
  imageUrl?: string | null;
  courses: { id: string; title: string }[];
  assignments: StudentAssignment[];
}

export interface SetProblem {
  id: string;
  setId: string;
  setTitle: string;
  title: string;
}

export interface TeacherStudentsWorkspaceProps {
  initialStudents: StudentItem[];
  courses: { id: string; title: string }[];
  availableSetProblems: SetProblem[];
}