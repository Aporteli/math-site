export interface HandleSelectDownContext {
    activeTool: string;
    setSelectedId: (id: string | null) => void;
  }
  
  /**
   * Returns `true` when the event was handled. `e` is the react-konva event.
   */
  export function handleSelectDown(ctx: HandleSelectDownContext, e: any): boolean {
    if (ctx.activeTool !== 'select') return false;
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) ctx.setSelectedId(null);
    return true;
  }