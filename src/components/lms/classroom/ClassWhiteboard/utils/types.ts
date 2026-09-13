import type { CanvasElement } from '../../KonvaCanvas/utils/types';

export type Tool =
  | 'select' | 'hand' | 'pen' | 'eraser' | 'text' | 'laser'
  | 'line' | 'arrow' | 'rect' | 'circle' | 'triangle' | 'diamond' | 'star';

export interface Student {
  identity: string;
  name: string;
}

export interface PageHistoryEntry {
  states: CanvasElement[][];
  index: number;
}

export type HistoryMap = Map<number, PageHistoryEntry>;

export interface BoardView {
  scale: number;
  x: number;
  y: number;
  pageIndex: number;
}