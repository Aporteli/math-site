//CUT

import { Circle, Group, Transformer } from 'react-konva';
import { useRef, type RefObject } from 'react';
import type { CanvasElement } from '../utils/types';
import { snapAngle } from '../utils/snapAngle';

interface SelectionOverlayProps {
  activeTool: string;
  selectedElements: CanvasElement[];
  trRef: RefObject<any>;
  elementsRef: RefObject<CanvasElement[]>;
  onElementsChange: (elements: CanvasElement[], options?: { commitHistory?: boolean }) => void;
  onTransformEnd: (e: any) => void;
}

const ROTATE_HANDLE_OFFSET = 22;
const ROTATE_HANDLE_RADIUS = 9;
const ROTATE_SNAP_THRESHOLD = 5;

export function SelectionOverlay({
  activeTool,
  selectedElements,
  trRef,
  elementsRef,
  onElementsChange,
  onTransformEnd,
}: SelectionOverlayProps) {
  const pendingRotationRef = useRef<{ id: string; rotation: number } | null>(null);

  if (activeTool !== 'select') return null;

  const single = selectedElements.length === 1 ? selectedElements[0] : null;
  const isText = single?.type === 'text';
  const isImage = single?.type === 'image';

  const rotationHandle = (() => {
    if (!single || !isImage) return null;

    const width = single.width ?? 0;
    const height = single.height ?? 0;
    if (!width || !height) return null;

    const sx = single.scaleX ?? 1;
    const sy = single.scaleY ?? 1;

    const w = width * sx;
    const h = height * sy;

    const cx = (single.x ?? 0) + w / 2;
    const cy = (single.y ?? 0) + h / 2;

    const cornerLocalX = w / 2;
    const cornerLocalY = h / 2;

    const dirLen = Math.hypot(cornerLocalX, cornerLocalY) || 1;
    const offLocalX = (cornerLocalX / dirLen) * ROTATE_HANDLE_OFFSET;
    const offLocalY = (cornerLocalY / dirLen) * ROTATE_HANDLE_OFFSET;

    const lx = cornerLocalX + offLocalX;
    const ly = cornerLocalY + offLocalY;

    const rad = ((single.rotation ?? 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return {
      x: cx + lx * cos - ly * sin,
      y: cy + lx * sin + ly * cos,
    };
  })();

  const handleRotateDrag = (e: any) => {
    if (!single) return;
    e.cancelBubble = true;

    const width = single.width ?? 0;
    const height = single.height ?? 0;
    if (!width || !height) return;

    const sx = single.scaleX ?? 1;
    const sy = single.scaleY ?? 1;

    const w = width * sx;
    const h = height * sy;

    const cx = (single.x ?? 0) + w / 2;
    const cy = (single.y ?? 0) + h / 2;

    const vx = e.target.x() - cx;
    const vy = e.target.y() - cy;

    const bx = w / 2;
    const by = h / 2;

    const angleDeg = (Math.atan2(vy, vx) - Math.atan2(by, bx)) * (180 / Math.PI);
    const normalized = ((angleDeg % 360) + 360) % 360;

    // Snap to exact 0/90/180/270 when the raw angle is within a few degrees.
    // Free rotation is preserved outside the threshold.
    const snapped = snapAngle(normalized, 90, ROTATE_SNAP_THRESHOLD);
    const finalRotation = Math.round(snapped);

    const stage = e.target.getStage();
    const node = stage?.findOne('#' + single.id);
    if (node) node.rotation(finalRotation);

    pendingRotationRef.current = { id: single.id, rotation: finalRotation };
  };

  const handleRotateEnd = (e: any) => {
    e.cancelBubble = true;
    const pending = pendingRotationRef.current;
    pendingRotationRef.current = null;
    if (!pending) return;

    const updated = elementsRef.current.map((el) =>
      el.id === pending.id ? { ...el, rotation: pending.rotation } : el,
    );
    elementsRef.current = updated;
    onElementsChange(updated);
  };

  return (
    <>
      <Transformer
        ref={trRef}
        rotateEnabled={false}
        enabledAnchors={isText ? ['middle-left', 'middle-right'] : undefined}
        keepRatio={false}
        boundBoxFunc={(oldBox, newBox) => {
          if (isText && newBox.width < 100) return oldBox;
          if (!isText && (newBox.width < 5 || newBox.height < 15)) return oldBox;
          return newBox;
        }}
        onTransformEnd={onTransformEnd}
      />

      {rotationHandle && (
        <Circle
          x={rotationHandle.x}
          y={rotationHandle.y}
          radius={ROTATE_HANDLE_RADIUS}
          fill="#ffffff"
          stroke="#4f46e5"
          strokeWidth={2}
          draggable
          onMouseDown={(e) => {
            e.cancelBubble = true;
          }}
          onTouchStart={(e) => {
            e.cancelBubble = true;
          }}
          onDragStart={(e) => {
            e.cancelBubble = true;
          }}
          onDragMove={handleRotateDrag}
          onDragEnd={handleRotateEnd}
          onMouseEnter={(e) => {
            const c = e.target.getStage()?.container();
            if (c) c.style.cursor = 'grab';
          }}
          onMouseLeave={(e) => {
            const c = e.target.getStage()?.container();
            if (c) c.style.cursor = 'default';
          }}
        />
      )}

      {single && single.points && single.type !== 'freedraw' && (
        <Group
          x={single.x || 0}
          y={single.y || 0}
          rotation={single.rotation || 0}
          scaleX={single.scaleX || 1}
          scaleY={single.scaleY || 1}
        >
          {Array.from({ length: single.points.length / 2 }).map((_, i) => (
            <Circle
              key={`anchor-${single.id}-${i}`}
              x={single.points![i * 2]}
              y={single.points![i * 2 + 1]}
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
                const newPoints = [...single.points!];
                newPoints[i * 2] = e.target.x();
                newPoints[i * 2 + 1] = e.target.y();
                const updatedElements = elementsRef.current.map((el) =>
                  el.id === single.id ? { ...el, points: newPoints } : el,
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