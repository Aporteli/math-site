export interface AssignmentProblemItem {
  id: string;
  topic: string;
  difficulty: string;
  promptTex?: string;
  previewUrl?: string;
  fileName?: string;
}

export interface AppliedAssignment {
  problemId: string;
  previewUrl: string;
  fileName: string;
}

export interface BatchUploadModalProps {
  problems: AssignmentProblemItem[];
  onClose: () => void;
  onApplyAssignments: (assignmentsMap: AppliedAssignment[]) => void;
}

export interface UploadedFileItem {
  id: string;
  name: string;
  url: string;
}
