'use client';

type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export function ResizeHandles({
  startResize,
}: {
  startResize: (edge: ResizeEdge) => (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <>
      <div onPointerDown={startResize('n')} className="absolute left-3 right-3 top-0 h-1 cursor-ns-resize" />

      <div onPointerDown={startResize('s')} className="absolute bottom-0 left-3 right-3 h-1 cursor-ns-resize" />

      <div onPointerDown={startResize('w')} className="absolute bottom-3 left-0 top-3 w-1 cursor-ew-resize" />

      <div onPointerDown={startResize('e')} className="absolute bottom-3 right-0 top-3 w-1 cursor-ew-resize" />

      <div onPointerDown={startResize('nw')} className="absolute left-0 top-0 size-3 cursor-nwse-resize" />

      <div onPointerDown={startResize('ne')} className="absolute right-0 top-0 size-3 cursor-nesw-resize" />

      <div onPointerDown={startResize('sw')} className="absolute bottom-0 left-0 size-3 cursor-nesw-resize" />

      <div onPointerDown={startResize('se')} className="absolute bottom-0 right-0 size-3 cursor-nwse-resize">
        <span className="pointer-events-none absolute bottom-1 right-1 size-1.5 rounded-box bg-muted/40" />
      </div>
    </>
  );
}
