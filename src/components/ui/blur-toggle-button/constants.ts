export const BLUR_LEVELS = [15, 25, 40] as const;
export type BlurLevel = (typeof BLUR_LEVELS)[number];
export const DEFAULT_BLUR_RADIUS: BlurLevel = 25;

export function getBlurLabel(level: number): string {
  if (level === 15) return 'დაბალი';
  if (level === 25) return 'საშუალო';
  return 'მაღალი';
}