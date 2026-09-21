'use client';

import { useCallback, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { CanvasElement, CropRegion } from '../utils/types';

export interface CropState {
  id: string;
  src: string;
  naturalW: number;
  naturalH: number;
  rect: CropRegion;
}

interface Options {
  elementsRef: MutableRefObject<CanvasElement[]>;
  onElementsChange: (elements: CanvasElement[], options?: { commitHistory?: boolean }) => void;
}

const MIN_SIDE = 16;

export function useInlineCrop({ elementsRef, onElementsChange }: Options) {
  const [cropState, setCropState] = useState<CropState | null>(null);
  const cropStateRef = useRef<CropState | null>(null);
  cropStateRef.current = cropState;

  const enter = useCallback((el: CanvasElement) => {
    if (el.type !== 'image' || !el.src) return;
    const src = el.src;
    const img = new window.Image();
    img.onload = () => {
      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;
      const existing = el.cropRegion;
      setCropState({
        id: el.id,
        src,
        naturalW,
        naturalH,
        rect: existing
          ? { x: existing.x, y: existing.y, w: existing.w, h: existing.h }
          : { x: 0, y: 0, w: naturalW, h: naturalH },
      });
    };
    img.onerror = () => console.error('Crop: failed to load image');
    img.src = src;
  }, []);

  const update = useCallback((rect: CropRegion) => {
    setCropState((s) => (s ? { ...s, rect } : s));
  }, []);

  const cancel = useCallback(() => setCropState(null), []);

  const confirm = useCallback(
    (overrideRect?: CropRegion) => {
      const state = cropStateRef.current;
      if (!state) return;

      const el = elementsRef.current.find((e) => e.id === state.id);
      if (!el) {
        setCropState(null);
        return;
      }

      const rect = overrideRect ?? state.rect;
      const { naturalW, naturalH } = state;

      if (rect.w < MIN_SIDE || rect.h < MIN_SIDE) {
        setCropState(null);
        return;
      }

      const existing = el.cropRegion;
      const srcW = existing ? existing.w : naturalW;
      const srcH = existing ? existing.h : naturalH;
      const dispW = el.width ?? naturalW;
      const dispH = el.height ?? naturalH;

      const scaleX = dispW / srcW;
      const scaleY = dispH / srcH;
      const oldSrcX = existing ? existing.x : 0;
      const oldSrcY = existing ? existing.y : 0;

      const newWidth = rect.w * scaleX;
      const newHeight = rect.h * scaleY;
      const newX = (el.x ?? 0) + (rect.x - oldSrcX) * scaleX;
      const newY = (el.y ?? 0) + (rect.y - oldSrcY) * scaleY;

      const updated = elementsRef.current.map((e) =>
        e.id === state.id
          ? {
              ...e,
              cropRegion: { ...rect },
              x: newX,
              y: newY,
              width: newWidth,
              height: newHeight,
            }
          : e,
      );

      onElementsChange(updated);
      setCropState(null);
    },
    [elementsRef, onElementsChange],
  );

  return { cropState, enter, update, cancel, confirm };
}