'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../constants/board';

export function useBoardViewport(zoomScale: number) {
  // Fit the shared 1920×1080 page to this screen. One scale keeps strokes proportional.
  const boardViewportRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = boardViewportRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width > 0 && height > 0) {
        setViewport((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const fitScale =
    viewport.width > 0 && viewport.height > 0
      ? Math.min(viewport.width / BOARD_WIDTH, viewport.height / BOARD_HEIGHT)
      : 1;
  const zoomScaleRef = useRef(zoomScale);
  // Latest zoom is read by the fit effect, which only reruns when the viewport changes.
  // eslint-disable-next-line react-hooks/refs -- same render-time sync as the previous component
  zoomScaleRef.current = zoomScale;
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  useLayoutEffect(() => {
    if (viewport.width === 0 || viewport.height === 0) return;
    const scale = zoomScaleRef.current * fitScale;
    setStagePos({
      x: (viewport.width - BOARD_WIDTH * scale) / 2,
      y: (viewport.height - BOARD_HEIGHT * scale) / 2,
    });
  }, [viewport.width, viewport.height, fitScale]);

  return { boardViewportRef, fitScale, stagePos, setStagePos };
}
