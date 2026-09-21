'use client';

/** Invisible hover strip that reveals the chrome when the board is fullscreen. */
export function BoardFullscreenSensor({ onEnter }: { onEnter: () => void }) {
  return (
    <div
      className="absolute inset-x-0 top-0 z-[1100] h-3"
      onMouseEnter={onEnter}
    />
  );
}