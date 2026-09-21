import type { MutableRefObject } from 'react';
import type { CanvasElement } from '../types';
import { tryMergeClosedPolygon } from '../polygonMerge';

export interface CommitShapeContext {
  elementsRef: MutableRefObject<CanvasElement[]>;
  onElementsChange: (elements: CanvasElement[], options?: { commitHistory?: boolean }) => void;
}

export function commitShape(ctx: CommitShapeContext, newElem: CanvasElement): void {
  if (newElem.type === 'line') {
    const mergedList = tryMergeClosedPolygon(ctx.elementsRef.current, newElem);
    if (mergedList) {
      ctx.onElementsChange(mergedList);
      return;
    }
  }
  ctx.onElementsChange([...ctx.elementsRef.current, newElem]);
}