import type { LucideIcon } from 'lucide-react';
import { Circle, Clock, GraduationCap } from 'lucide-react';
import type { Assignment, FilterStatus } from '../types/student-assignment.types';

const GEORGIAN_MONTHS = [
  'იანვარი',
  'თებერვალი',
  'მარტი',
  'აპრილი',
  'მაისი',
  'ივნისი',
  'ივლისი',
  'აგვისტო',
  'სექტემბერი',
  'ოქტომბერი',
  'ნოემბერი',
  'დეკემბერი',
];

export function formatGeorgianDateString(d: Date): string {
  const day = d.getDate();
  const month = GEORGIAN_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
}

export function progressOf(assignment: Assignment) {
  const total = assignment.problems.length;
  const done = assignment.problems.filter((p) => p.status === 'submitted' || p.status === 'graded').length;
  const graded = assignment.problems.filter((p) => p.status === 'graded').length;
  return { done, graded, total };
}

export function assignmentStatusMeta(assignment: Assignment): {
  id: 'graded' | 'submitted' | 'overdue' | 'notStarted';
  label: string;
  className: string;
  icon: LucideIcon;
} {
  const { done, total, graded } = progressOf(assignment);

  if (total > 0 && graded === total) {
    return {
      id: 'graded',
      label: 'ჩაბარებულია',
      icon: GraduationCap,
      className: 'border border-emerald-200 bg-emerald-100 text-emerald-700 font-bold',
    };
  }
  if (total > 0 && done === total) {
    return {
      id: 'submitted',
      label: 'გაგზავნილია',
      icon: Clock,
      className: 'border border-blue-200 bg-blue-100 text-blue-700 font-bold',
    };
  }
  if (assignment.overdue) {
    return {
      id: 'overdue',
      label: 'ვადაგასული',
      icon: Clock,
      className: 'border border-rose-200 bg-rose-50 text-rose-700 font-bold',
    };
  }

  return {
    id: 'notStarted',
    label: 'შესასრულებელი',
    icon: Circle,
    className: 'border border-hairline bg-paper text-muted',
  };
}

export function matchesFilter(assignment: Assignment, status: FilterStatus) {
  if (status === 'all') return true;
  const { done, total } = progressOf(assignment);
  if (status === 'submitted') return total > 0 && done === total;
  if (status === 'notStarted') return done === 0;
  return done > 0 && done < total;
}

export const FILTERS: { id: FilterStatus; label: string }[] = [
  { id: 'all', label: 'ყველა' },
  { id: 'notStarted', label: 'შესასრულებელი' },
  { id: 'submitted', label: 'გაგზავნილი' },
];

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

export function parseAndFormatDate(assignment: Assignment): { key: string; label: string; isToday: boolean } {
  let targetDate: Date | null = null;

  if (assignment.createdAt) {
    const d = new Date(assignment.createdAt);
    if (!isNaN(d.getTime())) targetDate = d;
  }

  if (!targetDate && assignment.publishedAt) {
    const d = new Date(assignment.publishedAt);
    if (!isNaN(d.getTime())) targetDate = d;
  }

  if (!targetDate) {
    targetDate = new Date();
  }

  const now = new Date();
  const isToday =
    targetDate.getFullYear() === now.getFullYear() &&
    targetDate.getMonth() === now.getMonth() &&
    targetDate.getDate() === now.getDate();

  const key = formatDateToKey(targetDate);
  const label = formatGeorgianDateString(targetDate);

  return { key, label, isToday };
}

export function isImageString(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.toLowerCase().trim();

  // თუ ფაილი PDF ან სხვა დოკუმენტია, სურათად არ ჩაითვალოს
  if (trimmed.endsWith('.pdf') || trimmed.endsWith('.txt') || trimmed.endsWith('.docx') || trimmed.endsWith('.doc')) {
    return false;
  }

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

export function extractImageUrls(raw?: string | null): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string' && isImageString(x));
      }
    } catch {
      // ignore
    }
  }

  if (isImageString(trimmed)) {
    return [trimmed];
  }

  return [];
}

export function extractFirstImageUrl(raw?: string | null): string | null {
  const urls = extractImageUrls(raw);
  return urls.length > 0 ? urls[0] : null;
}

export function isAssignmentMaterial(a: Assignment): boolean {
  // Only treat an item as a study material when it was explicitly sent as one.
  // Tasks ("დავალებები") must never be re-classified as materials just because
  // they contain problem text or an image / board snapshot.
  const problemId = typeof a.customPayload?.problemId === 'string' ? a.customPayload.problemId : '';
  const instructions = (a.instructions ?? '').trim().toLowerCase();
  const note = (a.note ?? '').trim().toLowerCase();

  return (
    a.type === 'MATERIAL' ||
    problemId.startsWith('mat-') ||
    instructions === 'მასალა' ||
    instructions.startsWith('მასალა:') ||
    note === 'მასალა' ||
    note.startsWith('მასალა:')
  );
}
