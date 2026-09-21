import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export function useStageSize(containerRef: RefObject<HTMLDivElement>) {
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      if (container.offsetWidth > 0 && container.offsetHeight > 0) {
        setStageSize({ width: container.offsetWidth, height: container.offsetHeight });
      }
    };
    handleResize();

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [containerRef]);

  return stageSize;
}