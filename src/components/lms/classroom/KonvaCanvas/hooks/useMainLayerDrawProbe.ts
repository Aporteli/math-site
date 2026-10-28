'use client';

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import type Konva from 'konva';
import {
  noteReceiverElementsSeen,
  probeGeneration,
  publishMainLayerDrawProbe,
  registerMainLayerDrawProbe,
} from '../diagnostics/mainLayerDrawProbe';

/** Registers the layer after commit. Measurement starts only from the console. */
export function useMainLayerDrawProbe(
  mainLayerRef: RefObject<Konva.Layer | null>,
  elements: readonly unknown[],
  diagLayout = false,
): void {
  const releaseRef = useRef<(() => void) | null>(null);
  const registeredRef = useRef<Konva.Layer | null>(null);
  const generationRef = useRef<symbol | null>(null);
  const elementsRef = useRef(elements);
  useLayoutEffect(() => {
    publishMainLayerDrawProbe();
    if (diagLayout && elementsRef.current !== elements) {
      elementsRef.current = elements;
      console.log('[TB-DIAG-LAYOUT]', { t: performance.now(), elementCount: elements.length });
    }
    if (mainLayerRef.current) noteReceiverElementsSeen(elements);
    const layer = mainLayerRef.current;
    if (layer === registeredRef.current && generationRef.current === probeGeneration) return;
    releaseRef.current?.();
    releaseRef.current = null;
    registeredRef.current = layer;
    generationRef.current = probeGeneration;
    if (layer) releaseRef.current = registerMainLayerDrawProbe(layer);
  });

  useEffect(() => {
    return () => {
      releaseRef.current?.();
      releaseRef.current = null;
      registeredRef.current = null;
      generationRef.current = null;
    };
  }, []);
}
