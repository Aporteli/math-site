import type { StudentAssignment } from '../types/teacher-workspace.types';

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export function formatDateToKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isDocumentString(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.toLowerCase().trim();
  return (
    trimmed.endsWith('.pdf') ||
    trimmed.endsWith('.txt') ||
    trimmed.endsWith('.doc') ||
    trimmed.endsWith('.docx') ||
    trimmed.endsWith('.rtf') ||
    trimmed.endsWith('.csv') ||
    trimmed.endsWith('.bin') ||
    (trimmed.startsWith('data:') && !trimmed.startsWith('data:image/'))
  );
}

export function isImageString(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.toLowerCase().trim();
  if (isDocumentString(trimmed)) return false;
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.includes('.png') ||
    trimmed.includes('.jpg') ||
    trimmed.includes('.jpeg') ||
    trimmed.includes('.webp') ||
    trimmed.includes('.gif') ||
    trimmed.includes('.svg')
  );
}

export function extractFirstImageUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const firstImage = parsed.find((item): item is string => typeof item === 'string' && isImageString(item));
        if (firstImage) return firstImage;
      }
    } catch {
      // ignore
    }
  }

  if (isImageString(trimmed)) return trimmed;
  return null;
}

export function getAssignmentViewKey(a: StudentAssignment): string {
  return `${a.id}:${a.submissionId || ''}:${a.studentAttachmentUrl || ''}:${a.status}`;
}

export function isMaterialItem(a: StudentAssignment): boolean {
  return (
    a.type === 'MATERIAL' ||
    (typeof a.id === 'string' && a.id.startsWith('mat-')) ||
    (typeof a.instructions === 'string' &&
      (a.instructions.trim().toLowerCase() === 'მასალა' ||
        a.instructions.trim().toLowerCase().startsWith('მასალა:'))) ||
    (typeof a.promptTex === 'string' && a.promptTex.startsWith('ფაილი:')) ||
    (typeof a.problemImageUrl === 'string' && isDocumentString(a.problemImageUrl))
  );
}