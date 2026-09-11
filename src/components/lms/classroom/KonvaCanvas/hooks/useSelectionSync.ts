import { useEffect } from 'react';
import type { RefObject } from 'react';
import Konva from 'konva';

export function useSelectionSync(
  selectedId: string | null,
  trRef: RefObject<any>,
  stageRef: RefObject<Konva.Stage>,
  mainLayerRef: RefObject<Konva.Layer>,
) {
  useEffect(() => {
    if (selectedId && trRef.current && stageRef.current) {
      const selectedNode = stageRef.current.findOne('#' + selectedId);
      if (selectedNode) {
        trRef.current.nodes([selectedNode]);
        mainLayerRef.current?.batchDraw();
      } else {
        trRef.current.nodes([]);
        mainLayerRef.current?.batchDraw();
      }
    } else if (trRef.current) {
      trRef.current.nodes([]);
      mainLayerRef.current?.batchDraw();
    }
  }, [selectedId, trRef, stageRef, mainLayerRef]);
}