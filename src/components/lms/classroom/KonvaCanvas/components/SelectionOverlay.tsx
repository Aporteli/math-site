import { Circle, Group, Transformer } from 'react-konva';
import type { RefObject } from 'react';
import type { CanvasElement } from '../utils/types';

interface SelectionOverlayProps {
  activeTool: string;
  selectedElement: CanvasElement | undefined;
  trRef: RefObject<any>;
  elementsRef: RefObject<CanvasElement[]>;
  onElementsChange: (elements: CanvasElement[], options?: { commitHistory?: boolean }) => void;
}

export function SelectionOverlay({
  activeTool,
  selectedElement,
  trRef,
  elementsRef,
  onElementsChange,
}: SelectionOverlayProps) {
  if (activeTool !== 'select') return null;

  return (
    <>
      <Transformer
        ref={trRef}
        enabledAnchors={
          selectedElement?.type === 'text'
            ? ['middle-left', 'middle-right']
            : [
                'top-left',
                'top-center',
                'top-right',
                'middle-left',
                'middle-right',
                'bottom-left',
                'bottom-center',
                'bottom-right',
              ]
        }
        centeredScaling={false}
        keepRatio={false}
        boundBoxFunc={(oldBox, newBox) => {
          if (selectedElement?.type === 'text' && newBox.width < 100) return oldBox;
          if (selectedElement?.type !== 'text' && (newBox.width < 5 || newBox.height < 15)) return oldBox;
          return newBox;
        }}
      />
      {selectedElement && selectedElement.points && selectedElement.type !== 'freedraw' && (
        <Group
          x={selectedElement.x || 0}
          y={selectedElement.y || 0}
          rotation={selectedElement.rotation || 0}
          scaleX={selectedElement.scaleX || 1}
          scaleY={selectedElement.scaleY || 1}>
          {Array.from({ length: selectedElement.points.length / 2 }).map((_, i) => (
            <Circle
              key={`anchor-${selectedElement.id}-${i}`}
              x={selectedElement.points![i * 2]}
              y={selectedElement.points![i * 2 + 1]}
              radius={8}
              fill="#16233a"
              stroke="#ffffff"
              strokeWidth={2}
              draggable
              onMouseDown={(e) => {
                e.cancelBubble = true;
              }}
              onDragStart={(e) => {
                e.cancelBubble = true;
              }}
              onDragMove={(e) => {
                e.cancelBubble = true;
                const newPoints = [...selectedElement.points!];
                newPoints[i * 2] = e.target.x();
                newPoints[i * 2 + 1] = e.target.y();
                const updatedElements = elementsRef.current.map((el) =>
                  el.id === selectedElement.id ? { ...el, points: newPoints } : el,
                );
                elementsRef.current = updatedElements;
                onElementsChange(updatedElements);
              }}
              onDragEnd={(e) => {
                e.cancelBubble = true;
              }}
              onMouseEnter={(e) => {
                const c = e.target.getStage()?.container();
                if (c) c.style.cursor = 'crosshair';
              }}
              onMouseLeave={(e) => {
                const c = e.target.getStage()?.container();
                if (c) c.style.cursor = 'default';
              }}
            />
          ))}
        </Group>
      )}
    </>
  );
}