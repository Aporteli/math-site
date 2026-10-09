import Konva from 'konva';
import type { MutableRefObject } from 'react';

export type PointerSpace = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  left: number;
  top: number;
  transform: Konva.Transform;
};

export function capturePointerSpace(stage: Konva.Stage, container: HTMLElement): PointerSpace {
  const rect = container.getBoundingClientRect();
  const transform = stage.getAbsoluteTransform().copy();
  transform.invert();
  return {
    x: stage.x(),
    y: stage.y(),
    scaleX: stage.scaleX(),
    scaleY: stage.scaleY(),
    left: rect.left,
    top: rect.top,
    transform,
  };
}

export function pointerSpaceFor(
  cache: MutableRefObject<PointerSpace | null>,
  stage: Konva.Stage | null,
  container: HTMLElement | null,
): PointerSpace | null {
  if (!stage || !container) return null;
  const current = cache.current;
  if (
    current &&
    current.x === stage.x() &&
    current.y === stage.y() &&
    current.scaleX === stage.scaleX() &&
    current.scaleY === stage.scaleY()
  ) {
    return current;
  }
  const next = capturePointerSpace(stage, container);
  cache.current = next;
  return next;
}
