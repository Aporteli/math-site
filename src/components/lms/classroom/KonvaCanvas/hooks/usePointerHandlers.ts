import type { PointerHandlerContext } from '../utils/usePointerHandlers.types';
import { usePointerDownHandler } from './usePointerDownHandler';
import { usePointerMoveHandler } from './usePointerMoveHandler';
import { usePointerUpHandler } from './usePointerUpHandler';

export function usePointerHandlers(ctx: PointerHandlerContext) {
  const handlePointerDown = usePointerDownHandler(ctx);
  const handlePointerMove = usePointerMoveHandler(ctx);
  const handlePointerUp = usePointerUpHandler(ctx);

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}