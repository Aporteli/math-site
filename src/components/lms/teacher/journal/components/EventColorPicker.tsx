'use client';

import { COLOR_DOT, COLOR_OPTIONS } from '../constants';
import type { EventColor, UpdateDraftHandler } from '../types';

interface EventColorPickerProps {
  color: EventColor;
  onUpdateDraft: UpdateDraftHandler;
}

export function EventColorPicker({ color, onUpdateDraft }: EventColorPickerProps) {
  return (
    <div className="flex items-center gap-2 pl-7">
      {COLOR_OPTIONS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onUpdateDraft({ color: c })}
          className={`size-5 rounded-box ${COLOR_DOT[c]} transition-transform hover:scale-110 ${
            color === c ? 'ring-2 ring-offset-2 ring-[#465D73]' : ''
          }`}
        />
      ))}
    </div>
  );
}
