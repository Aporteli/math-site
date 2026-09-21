export interface UpdateEraserHoverContext {
    activeTool: string;
    eraserCursorPos: { x: number; y: number } | null;
    getRelativePointerPosition: () => { x: number; y: number } | null;
    setEraserCursorPos: (pos: { x: number; y: number } | null) => void;
  }
  
  /**
   * Updates the eraser hover cursor when the eraser tool is active, or clears it
   * when it isn't. Runs before the pointer-id ownership check so the cursor can
   * still preview while another pointer owns the gesture.
   */
  export function updateEraserHover(ctx: UpdateEraserHoverContext): void {
    if (ctx.activeTool === 'eraser') {
      const hoverPos = ctx.getRelativePointerPosition();
      if (hoverPos) ctx.setEraserCursorPos(hoverPos);
    } else if (ctx.eraserCursorPos) {
      ctx.setEraserCursorPos(null);
    }
  }