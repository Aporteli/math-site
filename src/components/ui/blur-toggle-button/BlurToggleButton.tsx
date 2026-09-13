'use client';

import { useRef, useState } from 'react';
import { BlurToggle } from './BlurToggle';
import { IntensityTrigger } from './IntensityTrigger';
import { IntensityMenu } from './IntensityMenu';
import { useBackgroundBlur } from './useBackgroundBlur';
import { useClickOutside } from './useClickOutside';

export function BlurToggleButton() {
  const { hasRoom, isBlurred, blurRadius, isLoading, applyBlur, selectLevel } = useBackgroundBlur();
  const [showOptions, setShowOptions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setShowOptions(false));

  if (!hasRoom) return null;

  return (
    <div ref={menuRef} className="relative inline-flex items-center">
      <div className="flex items-center rounded-xl border border-white/10 bg-slate-800/90 p-1 shadow-lg backdrop-blur-md">
        <BlurToggle isBlurred={isBlurred} isLoading={isLoading} onClick={() => applyBlur(blurRadius, !isBlurred)} />

        {isBlurred && (
          <IntensityTrigger
            blurRadius={blurRadius}
            showOptions={showOptions}
            isLoading={isLoading}
            onClick={() => setShowOptions((prev) => !prev)}
          />
        )}
      </div>

      {isBlurred && showOptions && (
        <IntensityMenu
          blurRadius={blurRadius}
          isLoading={isLoading}
          onSelect={(level) => {
            selectLevel(level);
            setShowOptions(false);
          }}
        />
      )}
    </div>
  );
}
