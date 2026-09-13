import { Layer, Circle } from 'react-konva';

interface EraserCursorLayerProps {
  activeTool: string;
  eraserCursorPos: { x: number; y: number } | null;
  eraserWidth: number;
  isDark: boolean;
}

export function EraserCursorLayer({
  activeTool,
  eraserCursorPos,
  eraserWidth,
  isDark,
}: EraserCursorLayerProps) {
  return (
    <Layer listening={false}>
      {activeTool === 'eraser' && eraserCursorPos && (
        <Circle
          x={eraserCursorPos.x}
          y={eraserCursorPos.y}
          radius={Math.max(6, eraserWidth / 2)}
          fill={isDark ? 'rgba(248,250,252,0.18)' : 'rgba(15,23,42,0.12)'}
          stroke={isDark ? '#f8fafc' : '#0f172a'}
          strokeWidth={1.5}
          dash={[6, 4]}
        />
      )}
    </Layer>
  );
}