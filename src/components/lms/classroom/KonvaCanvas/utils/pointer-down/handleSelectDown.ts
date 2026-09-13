export interface HandleSelectDownContext {
    activeTool: string;
    getRelativePointerPosition: () => { x: number; y: number } | null;
    startMarquee: (pos: { x: number; y: number }) => void;
  }

  export function handleSelectDown(ctx: HandleSelectDownContext, e: any): boolean {
    if (ctx.activeTool !== 'select') return false;
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      const pos = ctx.getRelativePointerPosition();
      if (pos) ctx.startMarquee(pos);
    }
    return true;
  }