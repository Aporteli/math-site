import { Circle, Diamond, Minus, MoveRight, Square, Star, Triangle } from 'lucide-react';
import type { ToolId } from './types';

export const BOARD_WIDTH = 1920;
export const BOARD_HEIGHT = 1080;
export const STORAGE_KEY_PAGES = 'teacher_whiteboard_permanent_pages_v7';
export const PREFS_KEY = 'teacher_whiteboard_permanent_prefs_v7';

export const DEFAULT_COLOR = '#1e293b';
export const DARK_COLORS = ['#1e293b', '#000000']; // default dark-blue and black
export const LIGHT_COLOR = '#ffffff';

export const COLORS = [
  { hex: '#1e293b', label: 'მუქი ლურჯი' },
  { hex: '#000000', label: 'შავი' },
  { hex: '#ef4444', label: 'წითელი' },
  { hex: '#10b981', label: 'მწვანე' },
  { hex: '#3b82f6', label: 'ცისფერი' },
  { hex: '#f59e0b', label: 'ყვითელი' },
  { hex: '#8b5cf6', label: 'იასამნისფერი' },
  { hex: '#ffffff', label: 'თეთრი' },
];

export const STROKE_SIZES = [1, 2, 4, 8, 14];
export const ERASER_SIZES = [20, 32, 48, 64, 80];

export const SHAPE_TOOLS: { id: ToolId; icon: typeof Minus; label: string }[] = [
  { id: 'line', icon: Minus, label: 'ხაზი' },
  { id: 'arrow', icon: MoveRight, label: 'ისარი' },
  { id: 'rect', icon: Square, label: 'მართკუთხედი' },
  { id: 'circle', icon: Circle, label: 'წრე' },
  { id: 'triangle', icon: Triangle, label: 'სამკუთხედი' },
  { id: 'diamond', icon: Diamond, label: 'რომბი' },
  { id: 'star', icon: Star, label: 'ვარსკვლავი' },
];
