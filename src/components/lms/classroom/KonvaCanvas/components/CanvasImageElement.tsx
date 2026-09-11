import { useEffect, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import type { CanvasElement } from '../utils/types';

interface CanvasImageElementProps {
  el: CanvasElement;
  isListening: boolean;
  activeTool: string;
  onClick: () => void;
  onDragEnd: (e: any) => void;
  onTransformEnd: (e: any) => void;
}

export function CanvasImageElement({
  el,
  isListening,
  activeTool,
  onClick,
  onDragEnd,
  onTransformEnd,
}: CanvasImageElementProps) {
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!el.src) return;
    const img = new window.Image();
    img.src = el.src;
    img.onload = () => {
      setImageObj(img);
    };
  }, [el.src]);

  if (!imageObj) return null;

  return (
    <KonvaImage
      key={el.id}
      id={el.id}
      image={imageObj}
      x={el.x || 0}
      y={el.y || 0}
      width={el.width || imageObj.width}
      height={el.height || imageObj.height}
      rotation={el.rotation || 0}
      scaleX={el.scaleX || 1}
      scaleY={el.scaleY || 1}
      draggable={activeTool === 'select'}
      listening={isListening}
      onClick={onClick}
      onTap={onClick}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
}