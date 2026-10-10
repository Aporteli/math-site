import type { RefObject } from 'react';
import { Layer, Stage } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../utils/types';
import { EraserCursorLayer } from './EraserCursorLayer';
import { CanvasMainLayer } from './CanvasMainLayer';

interface CanvasStageProps {
  stageRef: RefObject<Konva.Stage | null>;
  mainLayerRef: RefObject<Konva.Layer | null>;
  drawLayerRef: RefObject<Konva.Layer | null>;
  marqueeLayerRef: RefObject<Konva.Layer | null>;
  laserLayerRef: RefObject<Konva.Layer | null>;
  trRef: RefObject<Konva.Transformer | null>;
  elementsRef: RefObject<CanvasElement[]>;
  stageSize: { width: number; height: number };
  scale: number;
  stagePos: { x: number; y: number };
  disabled: boolean;
  activeTool: string;
  isDark: boolean;
  strokeColor: string;
  strokeWidth: number;
  eraserWidth: number;
  elements: CanvasElement[];
  editingTextId: string | null;
  isCropping: boolean;
  eraserCursorPos: { x: number; y: number } | null;
  selectedIds: string[];
  isDrawing: { current: boolean };
  activeShapeRef: { current: Konva.Shape | null };
  isPinching: { current: boolean };
  isErasing: { current: boolean };
  setStagePos: (pos: { x: number; y: number }) => void;
  setEraserCursorPos: (pos: { x: number; y: number } | null) => void;
  finishTextEditing: () => void;
  handlePointerDown: (event: Konva.KonvaEventObject<PointerEvent>) => void;
  handlePointerMove: (event: Konva.KonvaEventObject<PointerEvent>) => void;
  handlePointerUp: (event: Konva.KonvaEventObject<PointerEvent>) => void;
  middlePan: {
    onPointerDown: (event: Konva.KonvaEventObject<PointerEvent>) => boolean;
    onPointerMove: (event: Konva.KonvaEventObject<PointerEvent>) => boolean;
    onPointerUp: (event: Konva.KonvaEventObject<PointerEvent>) => boolean;
  };
  onLiveStroke?: (stroke: { points: number[]; color: string; width: number }) => void;
  onElementsChange: (elements: CanvasElement[], options?: { commitHistory?: boolean; publish?: boolean }) => void;
  onElementClick: (el: CanvasElement) => void;
  onDragStart: (id: string, event: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove: (id: string, event: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (id: string, event: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (event: Konva.KonvaEventObject<Event>) => void;
  onTouchStart: (event: Konva.KonvaEventObject<TouchEvent>) => void;
  onTouchMove: (event: Konva.KonvaEventObject<TouchEvent>) => void;
  onTouchEnd: (event: Konva.KonvaEventObject<TouchEvent>) => void;
}

export function CanvasStage({
  stageRef,
  mainLayerRef,
  drawLayerRef,
  marqueeLayerRef,
  laserLayerRef,
  trRef,
  elementsRef,
  stageSize,
  scale,
  stagePos,
  disabled,
  activeTool,
  isDark,
  strokeColor,
  strokeWidth,
  eraserWidth,
  elements,
  editingTextId,
  isCropping,
  eraserCursorPos,
  selectedIds,
  isDrawing,
  activeShapeRef,
  isPinching,
  isErasing,
  setStagePos,
  setEraserCursorPos,
  finishTextEditing,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  middlePan,
  onLiveStroke,
  onElementsChange,
  onElementClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTransformEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: CanvasStageProps) {
  if (!(stageSize.width > 0 && stageSize.height > 0)) return null;

  const onStageDragEnd = (event: Konva.KonvaEventObject<DragEvent>) => {
    if (event.target === stageRef.current) setStagePos({ x: event.target.x(), y: event.target.y() });
  };

  const onPointerDown = (event: Konva.KonvaEventObject<PointerEvent>) => {
    if (disabled) return;
    if (middlePan.onPointerDown(event)) return;
    if (isCropping) return;
    if (isPinching.current) return;
    if (editingTextId) {
      finishTextEditing();
      return;
    }
    handlePointerDown(event);
  };

  const onPointerMove = (event: Konva.KonvaEventObject<PointerEvent>) => {
    if (disabled) return;
    if (middlePan.onPointerMove(event)) return;
    handlePointerMove(event);
    const liveShape = activeShapeRef.current as Konva.Line | null;
    if (onLiveStroke && activeTool === 'pen' && isDrawing.current && liveShape) {
      const pts = liveShape.points();
      if (pts.length >= 4) onLiveStroke({ points: pts, color: strokeColor, width: strokeWidth });
    }
  };

  const onPointerUp = (event: Konva.KonvaEventObject<PointerEvent>) => {
    if (disabled) return;
    if (middlePan.onPointerUp(event)) return;
    const liveShape = activeShapeRef.current as Konva.Line | null;
    if (onLiveStroke && activeTool === 'pen' && isDrawing.current && liveShape) {
      const pts = liveShape.points().slice();
      if (pts.length >= 4) onLiveStroke({ points: pts, color: strokeColor, width: strokeWidth });
    }
    handlePointerUp(event);
  };

  const onPointerLeave = () => {
    if (!isErasing.current) setEraserCursorPos(null);
  };

  return (
    <Stage
      ref={stageRef}
      width={stageSize.width}
      height={stageSize.height}
      scaleX={scale}
      scaleY={scale}
      x={stagePos.x}
      y={stagePos.y}
      draggable={!disabled && activeTool === 'hand'}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onDragEnd={onStageDragEnd}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      pixelRatio={typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2}>
      <CanvasMainLayer
        mainLayerRef={mainLayerRef}
        elements={elements}
        elementsRef={elementsRef}
        activeTool={activeTool}
        isDark={isDark}
        strokeWidth={strokeWidth}
        editingTextId={editingTextId}
        isCropping={isCropping}
        selectedIds={selectedIds}
        trRef={trRef}
        onElementsChange={onElementsChange}
        onElementClick={onElementClick}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      />
      <Layer ref={drawLayerRef} />
      <Layer ref={marqueeLayerRef} listening={false} />
      <EraserCursorLayer
        activeTool={activeTool}
        eraserCursorPos={eraserCursorPos}
        eraserWidth={eraserWidth}
        isDark={isDark}
      />
      <Layer ref={laserLayerRef} listening={false} />
    </Stage>
  );
}
