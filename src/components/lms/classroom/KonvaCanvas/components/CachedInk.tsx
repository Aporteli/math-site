'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Group } from 'react-konva';
import type Konva from 'konva';
import type { CanvasElement } from '../utils/types';

/** Skip the bitmap when the ink bounds would allocate a huge canvas. */
const MAX_CACHE_PIXELS = 4_000_000;

function inkBounds(elements: CanvasElement[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    if (el.type !== 'freedraw') continue;
    const pts = el.points;
    if (!pts || pts.length < 2) continue;
    const ox = el.x || 0;
    const oy = el.y || 0;
    const pad = (el.strokeWidth || 2) + 4;
    for (let i = 0; i < pts.length; i += 2) {
      const x = ox + pts[i];
      const y = oy + pts[i + 1];
      if (x - pad < minX) minX = x - pad;
      if (y - pad < minY) minY = y - pad;
      if (x + pad > maxX) maxX = x + pad;
      if (y + pad > maxY) maxY = y + pad;
    }
  }
  if (!Number.isFinite(minX)) return null;
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

/**
 * Finished pen strokes are painted once into a bitmap.
 * Later dashes blit that picture instead of redrawing every line.
 */
export function CachedInk({
  enabled,
  elements,
  isDark,
  children,
}: {
  enabled: boolean;
  elements: CanvasElement[];
  isDark: boolean;
  children: ReactNode;
}) {
  const groupRef = useRef<Konva.Group>(null);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearCache();
    if (!enabled) return;
    const bounds = inkBounds(elements);
    if (!bounds || bounds.width * bounds.height > MAX_CACHE_PIXELS) return;
    try {
      group.cache({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        pixelRatio: 1,
        imageSmoothingEnabled: true,
      });
      group.getLayer()?.batchDraw();
    } catch {
      group.clearCache();
    }
  }, [enabled, elements, isDark]);

  return (
    <Group ref={groupRef} listening={false}>
      {children}
    </Group>
  );
}
