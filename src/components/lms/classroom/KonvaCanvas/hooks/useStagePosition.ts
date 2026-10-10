import { useCallback, useState } from 'react';
import type { StagePosition } from '../utils/types';

export function useStagePosition(
  stagePosProp: StagePosition | undefined,
  onStagePosChange: ((pos: StagePosition) => void) | undefined,
) {
  const [internalStagePos, setInternalStagePos] = useState({ x: 0, y: 0 });

  const stagePos = stagePosProp ?? internalStagePos;
  const setStagePos = useCallback(
    (pos: { x: number; y: number }) => {
      if (onStagePosChange) onStagePosChange(pos);
      else setInternalStagePos(pos);
    },
    [onStagePosChange],
  );

  return { stagePos, setStagePos };
}
