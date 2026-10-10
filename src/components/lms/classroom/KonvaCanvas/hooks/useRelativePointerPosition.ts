import { useCallback } from 'react';
import type { RefObject } from 'react';
import type Konva from 'konva';

export function useRelativePointerPosition(stageRef: RefObject<Konva.Stage | null>) {
  return useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return transform.point(pos);
  }, [stageRef]);
}
