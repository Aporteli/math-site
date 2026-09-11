'use client';

import { useCallback, useState } from 'react';

export function useZoom() {
  const [zoomScale, setZoomScale] = useState<number>(1);

  const handleZoomIn = useCallback(() => {
    setZoomScale((prev) => Math.min(4, Math.round((prev + 0.15) * 100) / 100));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomScale((prev) => Math.max(0.2, Math.round((prev - 0.15) * 100) / 100));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomScale(1);
  }, []);

  const zoomPercent = Math.round(zoomScale * 100);

  return {
    zoomScale,
    setZoomScale,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    zoomPercent,
  };
}