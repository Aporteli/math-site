'use client';

import { useCallback, useRef, type MutableRefObject } from 'react';

interface Options {
  publishDataSafe: (payload: any, reliable?: boolean) => Promise<void>;
  currentPageIndexRef: MutableRefObject<number>;
}

export function useLaserPointer({ publishDataSafe, currentPageIndexRef }: Options) {
  const lastLaserSentRef = useRef<number>(0);

  return useCallback(
    (pos: { x: number; y: number } | null) => {
      const now = Date.now();
      if (!pos || now - lastLaserSentRef.current > 35) {
        lastLaserSentRef.current = now;
        void publishDataSafe(
          { type: 'WHITEBOARD_LASER', point: pos, pageIndex: currentPageIndexRef.current },
          false,
        );
      }
    },
    [publishDataSafe, currentPageIndexRef],
  );
}