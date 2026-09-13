import { useEffect, useState } from 'react';
import { Group, Image as KonvaImage } from 'react-konva';
import type { CanvasElement } from '../utils/types';

interface CanvasImageElementProps {
  el: CanvasElement;
  isListening: boolean;
  activeTool: string;
  onClick: () => void;
  onDragStart: (e: any) => void;
  onDragMove: (e: any) => void;
  onDragEnd: (e: any) => void;
}

export function CanvasImageElement({
  el,
  isListening,
  activeTool,
  onClick,
  onDragStart,
  onDragMove,
  onDragEnd,
}: CanvasImageElementProps) {
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!el.src) return;
    const img = new window.Image();
    img.src = el.src;
    img.onload = () => setImageObj(img);
  }, [el.src]);

  if (!imageObj) return null;

  const crop = el.cropRegion
    ? {
        x: el.cropRegion.x,
        y: el.cropRegion.y,
        width: el.cropRegion.w,
        height: el.cropRegion.h,
      }
    : undefined;

  const displayWidth = el.width || imageObj.width;
  const displayHeight = el.height || imageObj.height;

  // The element's `x`/`y` is the top-left corner. To rotate around the
  // visual center, wrap the image in a Group whose origin sits at the
  // element's center and offset the image by -half its size.
  //
  //   Group @ (x + w/2, y + h/2)  ── rotation pivots here (the center)
  //     Image @ (-w/2, -h/2)      ── places the image so its top-left is
  //                                  at the Group's origin minus half-size
  //
  // The Transformer in SelectionOverlay still targets the Group, so the
  // selection box rotates with the image and stays correct at any angle.
  const groupX = (el.x || 0) + displayWidth / 2;
  const groupY = (el.y || 0) + displayHeight / 2;

  return (
    <Group
      id={el.id}
      x={groupX}
      y={groupY}
      rotation={el.rotation || 0}
      scaleX={el.scaleX || 1}
      scaleY={el.scaleY || 1}
      offsetX={0}
      offsetY={0}
      draggable={activeTool === 'select'}
      listening={isListening}
      onClick={onClick}
      onTap={onClick}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    >
      <KonvaImage
        image={imageObj}
        crop={crop}
        x={-displayWidth / 2}
        y={-displayHeight / 2}
        width={displayWidth}
        height={displayHeight}
      />
    </Group>
  );
}