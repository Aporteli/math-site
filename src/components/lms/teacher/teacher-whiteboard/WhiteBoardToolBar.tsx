'use client';

import { Eraser, PanelLeftOpen, Pencil } from 'lucide-react';
import { PENCIL_COLORS, PENCIL_WIDTHS, type WhiteboardCopy } from './drawing';

type WhiteBoardToolBarProps = {
  copy: WhiteboardCopy;
  color: string;
  strokeWidth: number;
  saving: boolean;
  onToggleSidebar: () => void;
  onColor: (value: string) => void;
  onStrokeWidth: (value: number) => void;
  onClear: () => void;
};

export function WhiteBoardToolBar({
  copy,
  color,
  strokeWidth,
  saving,
  onToggleSidebar,
  onColor,
  onStrokeWidth,
  onClear,
}: WhiteBoardToolBarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-hairline bg-sectionHeader px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={copy.openMenu}
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-box border border-hairline bg-main text-icons shadow-sm transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText active:scale-[0.98]">
          <PanelLeftOpen className="size-4" />
        </button>
        <div>
          <h3 className="text-base font-bold leading-tight text-ink">{copy.title}</h3>
          <p className="text-xs text-muted" aria-live="polite">
            {saving ? '…' : copy.tools.pen}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed="true"
          title={copy.tools.pen}
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-box border border-brass/50 bg-brass-tint text-brass-strong shadow-sm">
          <Pencil className="size-4" aria-hidden="true" />
        </button>

        <div
          className="flex h-9 items-center gap-1 rounded-box border border-hairline bg-main px-1.5"
          role="group"
          aria-label={copy.colors}>
          {PENCIL_COLORS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onColor(value)}
              aria-pressed={color === value}
              aria-label={value}
              className={`size-6 rounded-full border ${
                color === value ? 'border-brass ring-2 ring-brass/40' : 'border-hairline'
              }`}
              style={{ backgroundColor: value }}
            />
          ))}
        </div>

        <div
          className="flex h-9 items-center gap-1 rounded-box border border-hairline bg-main px-1.5"
          role="group"
          aria-label={copy.strokeWidth}>
          {PENCIL_WIDTHS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onStrokeWidth(value)}
              aria-pressed={strokeWidth === value}
              className={`inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-box px-1.5 text-[11px] font-bold ${
                strokeWidth === value ? 'bg-brass-tint text-brass-strong' : 'text-muted hover:bg-mainButtonHover'
              }`}>
              {value}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClear}
          title={copy.clear}
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-box border border-hairline bg-main text-icons shadow-sm transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText active:scale-[0.98]">
          <Eraser className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
