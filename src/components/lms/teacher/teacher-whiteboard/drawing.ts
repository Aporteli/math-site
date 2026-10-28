export type Stroke = {
  id: string;
  type: 'freedraw';
  points: number[];
  stroke: string;
  strokeWidth: number;
};

export type WhiteboardCopy = {
  title: string;
  openMenu: string;
  tools: { pen: string };
  strokeWidth: string;
  colors: string;
  clear: string;
  clearTitle: string;
  clearMessage: string;
  cancel: string;
  confirmClear: string;
};

export const PENCIL_COLORS = ['#111827', '#b91c1c', '#1d4ed8', '#15803d'] as const;
export const PENCIL_WIDTHS = [2, 4, 8] as const;

export function isStroke(value: unknown): value is Stroke {
  if (!value || typeof value !== 'object') return false;
  const element = value as Partial<Stroke>;
  return (
    typeof element.id === 'string' &&
    element.id.length > 0 &&
    element.type === 'freedraw' &&
    typeof element.stroke === 'string' &&
    typeof element.strokeWidth === 'number' &&
    Array.isArray(element.points) &&
    element.points.every((point) => typeof point === 'number' && Number.isFinite(point))
  );
}

export function parseStrokes(raw: unknown): Stroke[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isStroke);
}

export function newStrokeId() {
  return `s_${crypto.randomUUID()}`;
}
