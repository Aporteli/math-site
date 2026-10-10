import type { RefObject } from 'react';
import { Layer } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../utils/types';
import { ElementRenderer } from './ElementRenderer';
import { SelectionOverlay } from './SelectionOverlay';

interface CanvasMainLayerProps {
  mainLayerRef: RefObject<Konva.Layer | null>;
  elements: CanvasElement[];
  elementsRef: RefObject<CanvasElement[]>;
  activeTool: string;
  isDark: boolean;
  strokeWidth: number;
  editingTextId: string | null;
  isCropping: boolean;
  selectedIds: string[];
  trRef: RefObject<Konva.Transformer | null>;
  onElementsChange: (elements: CanvasElement[], options?: { commitHistory?: boolean }) => void;
  onElementClick: (el: CanvasElement) => void;
  onDragStart: (id: string, event: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove: (id: string, event: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (id: string, event: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (event: Konva.KonvaEventObject<Event>) => void;
}

export function CanvasMainLayer({
  mainLayerRef,
  elements,
  elementsRef,
  activeTool,
  isDark,
  strokeWidth,
  editingTextId,
  isCropping,
  selectedIds,
  trRef,
  onElementsChange,
  onElementClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTransformEnd,
}: CanvasMainLayerProps) {
  return (
    <Layer ref={mainLayerRef}>
      <ElementRenderer
        elements={elements}
        activeTool={activeTool}
        isDark={isDark}
        strokeWidth={strokeWidth}
        editingTextId={editingTextId}
        onElementClick={onElementClick}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
      />
      {!isCropping && (
        <SelectionOverlay
          activeTool={activeTool}
          selectedElements={selectedIds
            .map((id) => elements.find((el) => el.id === id))
            .filter((el): el is CanvasElement => Boolean(el))}
          trRef={trRef}
          elementsRef={elementsRef}
          onElementsChange={onElementsChange}
          onTransformEnd={onTransformEnd}
        />
      )}
    </Layer>
  );
}
