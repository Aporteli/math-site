import type { CanvasElement } from '../../KonvaCanvas/utils/types';
import { DEFAULT_COLOR, DARK_COLORS, LIGHT_COLOR } from '../constants/colors';

export function isLightInk(stroke: string): boolean {
  const value = stroke.trim().toLowerCase();
  return value === LIGHT_COLOR || value === '#fff' || value === 'white' || value === 'rgb(255,255,255)';
}

export function adaptStrokeForTheme(stroke: string | undefined, isDark: boolean): string {
  const value = stroke || DEFAULT_COLOR;
  if (isDark && DARK_COLORS.includes(value)) return LIGHT_COLOR;
  if (!isDark && isLightInk(value)) return DEFAULT_COLOR;
  return value;
}

export function adaptElementsForTheme(elements: CanvasElement[], isDark: boolean): CanvasElement[] {
  return elements.map((el) => {
    const next = adaptStrokeForTheme(el.stroke, isDark);
    return next === el.stroke ? el : { ...el, stroke: next };
  });
}
