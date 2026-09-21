export function snapToAxis(start: { x: number; y: number }, cur: { x: number; y: number }): { x: number; y: number } {
  const dx = cur.x - start.x,
    dy = cur.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return start;
  const step = Math.PI / 4;
  const angle = Math.round(Math.atan2(dy, dx) / step) * step;
  return { x: start.x + Math.cos(angle) * len, y: start.y + Math.sin(angle) * len };
}
