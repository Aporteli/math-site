'use client';

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import type Konva from 'konva';
import {
  probeGeneration,
  publishMainLayerDrawProbe,
  registerMainLayerDrawProbe,
} from '../diagnostics/mainLayerDrawProbe';

/** Registers the layer after commit. Measurement starts only from the console. */
export function useMainLayerDrawProbe(mainLayerRef: RefObject<Konva.Layer | null>): void {
  const releaseRef = useRef<(() => void) | null>(null);
  const registeredRef = useRef<Konva.Layer | null>(null);
  const generationRef = useRef<symbol | null>(null);

  useLayoutEffect(() => {
    publishMainLayerDrawProbe();
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
