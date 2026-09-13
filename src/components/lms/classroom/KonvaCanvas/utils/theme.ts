import { DEFAULT_INK_COLOR, LIGHT_INK_COLOR, DARK_INK_COLORS } from './constants';

export function adaptStrokeForTheme(stroke: string | undefined, isDark: boolean): string {
  const value = stroke || DEFAULT_INK_COLOR;
  const normalized = value.trim().toLowerCase();
  const isInkLight =
    normalized === LIGHT_INK_COLOR ||
    normalized === '#fff' ||
    normalized === 'white' ||
    normalized === 'rgb(255,255,255)';
  if (isDark && DARK_INK_COLORS.includes(value)) return LIGHT_INK_COLOR;
  if (!isDark && isInkLight) return DEFAULT_INK_COLOR;
  return value;
}