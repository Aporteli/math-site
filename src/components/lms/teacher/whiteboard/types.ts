import type { Dictionary } from '@/i18n/types';

export type WhiteboardCopy = Dictionary['dashboard']['teacher']['whiteboard'];

export type ToolId =
  | 'select'
  | 'hand'
  | 'pen'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'text'
  | 'eraser'
  | 'laser';

export type StylusButtonAction = 'temporary-eraser' | 'toggle-eraser' | 'cycle-colors' | 'toggle-laser' | 'undo' | 'none';

export interface CourseGroup {
  id: string;
  title: string;
  students: { id: string; name: string; email?: string }[];
}
