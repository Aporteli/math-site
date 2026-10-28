'use client';

import { useRef, type RefObject } from 'react';
import { Layer, Line, Stage } from 'react-konva';
import type Konva from 'konva';
import type { Stroke } from './drawing';

type WhiteBoardCanvasProps = {
  width: number;
  height: number;
  strokes: Stroke[];
  currentStroke: Stroke | null;
  onPointerDown: (x: number, y: number) => void;
  onPointerMove: (x: number, y: number) => void;
  onPointerUp: () => void;
};

function pointerOnStage(stageRef: RefObject<Konva.Stage | null>) {
  const stage = stageRef.current;
  const point = stage?.getPointerPosition();
  if (!point) return null;
  return point;
}

function StrokeLine({ stroke }: { stroke: Stroke }) {
  return (
    <Line
      points={stroke.points}
      stroke={stroke.stroke}
      strokeWidth={stroke.strokeWidth}
      tension={0.3}
      lineCap="round"
      lineJoin="round"
      listening={false}
    />
  );
}

export default function WhiteBoardCanvas({
  width,
  height,
  strokes,
  currentStroke,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: WhiteBoardCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);

  if (width < 1 || height < 1) return null;

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      style={{ touchAction: 'none', cursor: 'crosshair' }}
      onMouseDown={() => {
        const point = pointerOnStage(stageRef);
        if (point) onPointerDown(point.x, point.y);
      }}
      onMouseMove={() => {
        const point = pointerOnStage(stageRef);
        if (point) onPointerMove(point.x, point.y);
      }}
      onMouseUp={onPointerUp}
      onMouseLeave={onPointerUp}
      onTouchStart={(event) => {
        event.evt.preventDefault();
        const point = pointerOnStage(stageRef);
        if (point) onPointerDown(point.x, point.y);
      }}
      onTouchMove={(event) => {
        event.evt.preventDefault();
        const point = pointerOnStage(stageRef);
        if (point) onPointerMove(point.x, point.y);
      }}
      onTouchEnd={onPointerUp}>
      <Layer listening={false}>
        {strokes.map((stroke) => (
          <StrokeLine key={stroke.id} stroke={stroke} />
        ))}
        {currentStroke ? <StrokeLine stroke={currentStroke} /> : null}
      </Layer>
    </Stage>
  );
}
