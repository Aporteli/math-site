export interface HandleEraserUpContext {
    activeTool: string;
    commitErase: () => void;
  }
  
  /** Returns `true` when the event was handled (caller should return). */
  export function handleEraserUp(ctx: HandleEraserUpContext): boolean {
    if (ctx.activeTool !== 'eraser') return false;
    ctx.commitErase();
    return true;
  }