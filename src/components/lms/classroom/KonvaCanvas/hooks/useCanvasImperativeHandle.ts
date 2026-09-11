import { useImperativeHandle } from 'react';
import type { Ref, RefObject } from 'react';
import Konva from 'konva';
import type { KonvaCanvasHandle } from '../utils/types';

interface UseCanvasImperativeHandleOptions {
  ref: Ref<KonvaCanvasHandle>;
  stageRef: RefObject<Konva.Stage>;
  trRef: RefObject<any>;
  mainLayerRef: RefObject<Konva.Layer>;
  isDark: boolean;
  fitToContent: () => void;
  renderRemoteLaser: (point: { x: number; y: number } | null) => void;
  deleteSelected: () => void;
  cropSelectedImage: () => void;
}

export function useCanvasImperativeHandle({
  ref,
  stageRef,
  trRef,
  mainLayerRef,
  isDark,
  fitToContent,
  renderRemoteLaser,
  deleteSelected,
  cropSelectedImage,
}: UseCanvasImperativeHandleOptions) {
  useImperativeHandle(
    ref,
    () => ({
      toDataURL: () => {
        const stage = stageRef.current;
        if (!stage) return null;
        if (trRef.current) {
          trRef.current.nodes([]);
          mainLayerRef.current?.batchDraw();
        }

        const bgRect = new Konva.Rect({
          x: -stage.x() / stage.scaleX(),
          y: -stage.y() / stage.scaleY(),
          width: stage.width() / stage.scaleX(),
          height: stage.height() / stage.scaleY(),
          fill: isDark ? '#020617' : '#ffffff',
          listening: false,
        });

        mainLayerRef.current?.add(bgRect);
        bgRect.moveToBottom();
        mainLayerRef.current?.batchDraw();

        const dataUrl = stage.toDataURL({ pixelRatio: 2 });
        bgRect.destroy();
        mainLayerRef.current?.batchDraw();

        return dataUrl;
      },
      fitToContent,
      renderRemoteLaser,
      deleteSelected,
      cropSelectedImage,
    }),
    [stageRef, trRef, mainLayerRef, isDark, fitToContent, renderRemoteLaser, deleteSelected, cropSelectedImage],
  );
}