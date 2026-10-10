'use client';

import type { MutableRefObject } from 'react';
import { useLaserPointer } from './useLaserPointer';
import type { PublishDataSafe } from './usePublishDataSafe';

export function useBoardLaser(
  publishDataSafe: PublishDataSafe,
  getSyncDestinations: (pageIndex: number) => string[] | undefined,
  currentPageIndexRef: MutableRefObject<number>,
) {
  return useLaserPointer({
    publishDataSafe: (payload, reliable) => {
      const destinations = getSyncDestinations(currentPageIndexRef.current);
      return publishDataSafe(payload, reliable, destinations);
    },
    currentPageIndexRef,
  });
}
