const SHAPE_IDS = ['line', 'arrow', 'rect', 'circle', 'triangle', 'diamond', 'star'] as const;

export function getToolbarKey(activeTool: string | null | undefined): string | null {
  if (!activeTool) return null;
  if (activeTool === 'pen') return 'pen';
  if (activeTool === 'eraser') return 'eraser';
  if (activeTool === 'laser') return 'laser';
  if (activeTool === 'select') return 'select';
  if (activeTool === 'hand') return 'hand';
  if (activeTool === 'text') return 'text';
  if (SHAPE_IDS.includes(activeTool as (typeof SHAPE_IDS)[number])) return 'shapes';
  return null;
}