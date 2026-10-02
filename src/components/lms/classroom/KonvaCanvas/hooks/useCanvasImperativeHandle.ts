import { useImperativeHandle } from 'react';
import type { ForwardedRef, RefObject } from 'react';
import Konva from 'konva';
import type { KonvaCanvasHandle } from '../utils/types';

interface Options {
  ref: ForwardedRef<KonvaCanvasHandle>;
  stageRef: RefObject<Konva.Stage | null>;
  trRef: RefObject<any>;
  mainLayerRef: RefObject<Konva.Layer | null>;
  isDark: boolean;
  fitToContent: () => void;
  renderRemoteLaser: (point: { x: number; y: number } | null) => void;
  renderRemoteInk: (stroke: { points: number[]; color: string; width: number } | null) => void;
  deleteSelected: () => void;
  cropSelectedImage: () => void;
  selectElement: (id: string) => void;
}

export function useCanvasImperativeHandle({
  ref,
  stageRef,
  trRef,
  mainLayerRef,
  isDark,
  fitToContent,
  renderRemoteLaser,
  renderRemoteInk,
  deleteSelected,
  cropSelectedImage,
  selectElement,
}: Options) {
  useImperativeHandle(
    ref,
    () => ({
      toDataURL: () => stageRef.current?.toDataURL() ?? null,
      fitToContent,
      renderRemoteLaser,
      renderRemoteInk,
      deleteSelected,
      cropSelectedImage,
      selectElement,
    }),
    [
      stageRef,
      trRef,
      mainLayerRef,
      isDark,
      fitToContent,
      renderRemoteLaser,
      renderRemoteInk,
      deleteSelected,
      cropSelectedImage,
      selectElement,
    ],
  );
}