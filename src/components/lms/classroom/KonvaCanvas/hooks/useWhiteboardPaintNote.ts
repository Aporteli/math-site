import { useEffect } from 'react';
import type { RefObject } from 'react';
import type Konva from 'konva';
import { noteWhiteboardPaint } from '@/lib/livekit/diagnostics/whiteboard-message';
import type { CanvasElement } from '../utils/types';

export function useWhiteboardPaintNote(elements: CanvasElement[], stageRef: RefObject<Konva.Stage | null>) {
  useEffect(() => {
    const started = Date.now();
    const elementCount = elements.length;
    const stage = stageRef.current;
    const width = stage?.width() ?? 0;
    const height = stage?.height() ?? 0;
    const pixelRatio = window.devicePixelRatio || 1;
    let cancelled = false;
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => {
        if (cancelled) return;
        noteWhiteboardPaint({
          elementCount,
          stageWidth: width,
          stageHeight: height,
          devicePixelRatio: pixelRatio,
          renderDurationMs: Date.now() - started,
        });
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(first);
      if (second) window.cancelAnimationFrame(second);
    };
  }, [elements, stageRef]);
}
